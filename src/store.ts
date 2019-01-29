import { applyMiddleware, createStore, Dispatch, Reducer, Store } from "redux";
import { combineEpics, createEpicMiddleware, Epic } from "redux-observable";
import { BehaviorSubject, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { AnyAction } from "./action";
import { UseContainer } from "./container";
import { Models } from "./model";

import { createStoreCache } from "./cache";
import { createEffectsRootReduxObservableEpic } from "./effect";
import { registerModels } from "./model";
import { createRootReduxReducer } from "./reducer";

export interface ReduxAdvancedStore extends Store {
  useContainer: UseContainer;
}

export interface ReduxAdvancedOptions {
  createStore?: (rootReducer: Reducer, rootEpic: Epic) => Store;
  effectErrorHandler?: (error: any, dispatch: Dispatch) => Promise<void>;
  epicErrorHandler?: (
    error: any,
    caught: Observable<AnyAction>
  ) => Observable<AnyAction>;
}

export function createReduxAdvancedStore<
  TDependencies,
  TModels extends Models<TDependencies>
>(
  dependencies: TDependencies,
  models: TModels,
  options?: ReduxAdvancedOptions
): ReduxAdvancedStore {
  if (options == null) {
    options = {};
  }

  const storeCache = createStoreCache();

  storeCache.options = options;
  storeCache.dependencies = dependencies;

  registerModels(storeCache, "", models);

  const rootReducer: Reducer = createRootReduxReducer(storeCache);
  const effectRootEpic: Epic = createEffectsRootReduxObservableEpic(storeCache);

  storeCache.addEpic$ = new BehaviorSubject(
    combineEpics(effectRootEpic, ...storeCache.initialEpics)
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

  const store = storeCache.store as ReduxAdvancedStore;
  store.useContainer = storeCache.useContainer;

  return store;
}
