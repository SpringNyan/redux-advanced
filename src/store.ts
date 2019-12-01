import {
  applyMiddleware,
  createStore,
  Middleware,
  Reducer,
  Store,
} from "redux";
import { createEpicMiddleware, Epic } from "redux-observable";
import { mergeMap, switchMap } from "rxjs/operators";
import { registerActionHelper, reloadActionHelper } from "./action";
import { GetContainer } from "./container";
import { createStoreContext } from "./context";
import { createMiddleware } from "./middleware";
import { Models, registerModels } from "./model";
import { createReduxReducer } from "./reducer";

export interface ReduxAdvancedOptions {
  dependencies: any;

  createStore?: (context: {
    reducer: Reducer;
    epic: Epic;
    middleware: Middleware;
  }) => Store;

  resolveActionName?: (paths: string[]) => string;

  onUnhandledEffectError?: (error: any) => void;
  onUnhandledEpicError?: (error: any) => void;
}

export interface ReduxAdvancedInstance {
  store: Store;
  getContainer: GetContainer;
  registerModels: (models: Models) => void;
  reload: (state?: any) => void;
}

export function init(options: ReduxAdvancedOptions): ReduxAdvancedInstance {
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

  if (options.createStore) {
    storeContext.store = options.createStore({
      reducer: rootReducer,
      epic: rootEpic,
      middleware,
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
    registerModels: (models) => {
      const registerOptionsList = registerModels(storeContext, "", models);
      storeContext.store.dispatch(
        registerActionHelper.create(registerOptionsList)
      );
    },
    reload: (state) => {
      storeContext.store.dispatch(reloadActionHelper.create({ state }));
    },
  };
}
