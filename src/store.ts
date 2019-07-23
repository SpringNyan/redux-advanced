import {
  applyMiddleware,
  createStore,
  Middleware,
  Reducer,
  Store
} from "redux";
import { createEpicMiddleware, Epic } from "redux-observable";
import { Observable } from "rxjs";
import { mergeMap, switchMap } from "rxjs/operators";

import { AnyAction, reloadActionHelper } from "./action";
import { GetContainer } from "./container";
import { createStoreContext } from "./context";
import { createMiddleware } from "./middleware";
import { createRegisterModels, RegisterModels } from "./model";
import { createReduxReducer } from "./reducer";

export interface ReduxAdvancedOptions {
  dependencies: any;

  createStore?: (context: {
    reducer: Reducer;
    epic: Epic;
    middleware: Middleware;
  }) => Store;

  resolveActionName?: (paths: string[]) => string;

  defaultEffectErrorHandler?: (error: any) => void;
  defaultEpicErrorHandler?: (
    error: any,
    caught: Observable<AnyAction>
  ) => Observable<AnyAction>;
}

export interface ReduxAdvancedContext {
  store: Store;
  getContainer: GetContainer;
  registerModels: RegisterModels;
  reload: (state?: any) => void;
}

export function init(options: ReduxAdvancedOptions): ReduxAdvancedContext {
  if (options.resolveActionName == null) {
    options.resolveActionName = (paths) => paths.join(".");
  }

  const storeContext = createStoreContext();
  storeContext.options = options;

  const rootReducer: Reducer = createReduxReducer(storeContext);
  const rootEpic: Epic = (action$, state$, ...rest) =>
    storeContext.switchEpic$.pipe(
      switchMap(() =>
        storeContext.addEpic$.pipe(
          mergeMap((epic) => epic(action$, state$, ...rest))
        )
      )
    );
  const middleware = createMiddleware(storeContext);

  if (options.createStore != null) {
    storeContext.store = options.createStore({
      reducer: rootReducer,
      epic: rootEpic,
      middleware
    });
  } else {
    const epicMiddleware = createEpicMiddleware();
    storeContext.store = createStore(
      rootReducer,
      applyMiddleware(middleware, epicMiddleware)
    );
    epicMiddleware.run(rootEpic);
  }

  storeContext.switchEpic$.next();

  return {
    store: storeContext.store,
    getContainer: storeContext.getContainer,
    registerModels: createRegisterModels(storeContext),
    reload: (state) => {
      storeContext.store.dispatch(reloadActionHelper.create({ state }));
    }
  };
}
