import { applyMiddleware, createStore, Reducer, Store } from "redux";
import { combineEpics, createEpicMiddleware, Epic } from "redux-observable";
import { BehaviorSubject, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { AnyAction } from "./action";
import { UseContainer } from "./container";
import { Models } from "./model";

import { createStoreCache } from "./cache";
import { registerModels } from "./model";
import { createReduxRootReducer } from "./reducer";

export interface AdvancedStore extends Store {
  useContainer: UseContainer;
}

export interface ReduxAdvancedOptions {
  createStore?: (rootReducer: Reducer, rootEpic: Epic) => Store;
  epicErrorHandler?: (
    err: any,
    caught: Observable<AnyAction>
  ) => Observable<AnyAction>;
}

export function createAdvancedStore<
  TDependencies,
  TModels extends Models<TDependencies>
>(
  dependencies: TDependencies,
  models: TModels,
  options?: ReduxAdvancedOptions
): AdvancedStore {
  if (options == null) {
    options = {};
  }

  const storeCache = createStoreCache();

  storeCache.options = options;
  storeCache.dependencies = dependencies;

  registerModels(storeCache, "", models);

  const rootReducer: Reducer = createReduxRootReducer(storeCache);

  storeCache.addEpic$ = new BehaviorSubject(
    combineEpics(...storeCache.initialEpics)
  );
  const rootEpic: Epic = (action$, state$, epicDependencies) =>
    storeCache.addEpic$.pipe(
      mergeMap((epic) => epic(action$, state$, epicDependencies))
    );

  if (options.createStore != null) {
    storeCache.store = options.createStore(rootReducer, rootEpic);
  } else {
    const epicMiddleware = createEpicMiddleware();

    storeCache.store = createStore(
      rootReducer,
      applyMiddleware(epicMiddleware)
    );

    epicMiddleware.run(rootEpic);
  }

  const store = storeCache.store as AdvancedStore;
  store.useContainer = storeCache.useContainer;

  return store;
}
