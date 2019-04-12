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
import { GetContainer } from "./container";
import { Models } from "./model";

import { createStoreCache } from "./cache";
import { createMiddleware } from "./middleware";
import { registerModels } from "./model";
import { createRootReduxReducer } from "./reducer";

export interface ReduxAdvancedStore extends Store {
  getContainer: GetContainer;
}

export interface ReduxAdvancedOptions {
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

export function createReduxAdvancedStore<
  TDependencies extends object | undefined,
  TModels extends Models<TDependencies>
>(
  dependencies: TDependencies,
  models: TModels,
  options?: ReduxAdvancedOptions
): ReduxAdvancedStore {
  if (options == null) {
    options = {};
  }
  if (options.resolveActionName == null) {
    options.resolveActionName = (paths) => paths[paths.length - 1];
  }

  const storeCache = createStoreCache();

  storeCache.options = options;
  storeCache.dependencies = dependencies;

  registerModels(storeCache, "", models);

  const rootReducer: Reducer = createRootReduxReducer(storeCache);

  storeCache.addEpic$ = new BehaviorSubject(
    combineEpics(...storeCache.initialEpics)
  );
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

  const store = storeCache.store as ReduxAdvancedStore;
  store.getContainer = storeCache.getContainer;

  return store;
}
