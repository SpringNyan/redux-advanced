import {
  applyMiddleware,
  createStore,
  Middleware,
  Reducer,
  Store
} from "redux";
import { combineEpics, createEpicMiddleware, Epic } from "redux-observable";
import { BehaviorSubject, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { AnyAction } from "./action";
import { createStoreCache } from "./cache";
import { GetContainer } from "./container";
import { createMiddleware } from "./middleware";
import { Models, registerModels } from "./model";
import { createRootReduxReducer } from "./reducer";

export interface ReduxAdvancedOptions {
  models: Models;
  dependencies: any;

  createStore?: (
    rootReducer: Reducer,
    rootEpic: Epic,
    reduxAdvancedMiddleware: Middleware
  ) => Store;
  resolveActionName?: (paths: string[]) => string;
  effectErrorHandler?: (error: any) => void;
  epicErrorHandler?: (
    error: any,
    caught: Observable<AnyAction>
  ) => Observable<AnyAction>;
}

export function init(
  options: ReduxAdvancedOptions
): {
  store: Store;
  getContainer: GetContainer;
} {
  if (options.resolveActionName == null) {
    options.resolveActionName = (paths) => paths[paths.length - 1];
  }

  const storeCache = createStoreCache();

  storeCache.options = options;
  storeCache.dependencies = options.dependencies;

  registerModels(storeCache, "", options.models);
  storeCache.pendingInitContainers.forEach(({ container, initialState }) => {
    container.register(initialState);
  });
  storeCache.pendingInitContainers.length = 0;

  const rootReducer: Reducer = createRootReduxReducer(storeCache);

  storeCache.addEpic$ = new BehaviorSubject(
    combineEpics(...storeCache.pendingInitEpics)
  );
  storeCache.pendingInitEpics.length = 0;

  const rootEpic: Epic = (action$, state$, epicDependencies) =>
    storeCache.addEpic$.pipe(
      mergeMap((epic) => epic(action$, state$, epicDependencies))
    );

  const reduxAdvancedMiddleware = createMiddleware(storeCache);

  if (options.createStore != null) {
    storeCache.store = options.createStore(
      rootReducer,
      rootEpic,
      reduxAdvancedMiddleware
    );
  } else {
    const epicMiddleware = createEpicMiddleware();

    storeCache.store = createStore(
      rootReducer,
      applyMiddleware(reduxAdvancedMiddleware, epicMiddleware)
    );

    epicMiddleware.run(rootEpic);
  }

  storeCache.initialized = true;

  return {
    store: storeCache.store,
    getContainer: storeCache.getContainer
  };
}
