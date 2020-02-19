import produce from "immer";
import { Reducer as ReduxReducer } from "redux";
import {
  ExtractActionPayload,
  registerActionHelper,
  RegisterOptions,
  reloadActionHelper,
  ReloadOptions,
  unregisterActionHelper,
  UnregisterOptions,
} from "./action";
import { createRequiredArg, generateArgs } from "./args";
import { StoreContext } from "./context";
import { Model } from "./model";
import { getSubState, setSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, nothingToken, splitLastPart } from "./util";

export interface ReducerContext<TDependencies = any> {
  dependencies: TDependencies;

  baseNamespace: string;
  key: string | undefined;
  modelIndex: number | undefined;
}

export type Reducer<
  TDependencies = any,
  TState extends object = any,
  TPayload = any
> = (
  state: TState,
  payload: TPayload,
  context: ReducerContext<TDependencies>
) => void;

export interface Reducers<TDependencies = any, TState extends object = any> {
  [name: string]:
    | Reducer<TDependencies, TState>
    | Reducers<TDependencies, TState>;
}

export type ExtractReducers<T extends Model> = T extends Model<
  any,
  any,
  any,
  any,
  infer TReducers,
  any,
  any
>
  ? TReducers
  : never;

export type OverrideReducers<
  TReducers,
  TDependencies,
  TState extends object
> = {
  [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any
    ? Reducer<TDependencies, TState, ExtractActionPayload<TReducers[P]>>
    : OverrideReducers<TReducers[P], TDependencies, TState>;
};

export type LooseReducers<TReducers> = {
  [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any
    ? Reducer<any, any, ExtractActionPayload<TReducers[P]>>
    : LooseReducers<TReducers[P]>;
};

export function createReduxReducer(storeContext: StoreContext): ReduxReducer {
  function register(rootState: any, optionsList: RegisterOptions[]) {
    optionsList.forEach((options) => {
      const { baseNamespace, key, modelIndex } = options;

      const models = storeContext.modelsByBaseNamespace.get(baseNamespace);
      if (models == null) {
        throw new Error(
          `Failed to register reducer: no model found for namespace "${baseNamespace}"`
        );
      }

      const model = models[modelIndex ?? 0];

      let state: any;
      if (options.state !== undefined) {
        state = options.state;
      } else {
        const args = generateArgs(
          model,
          {
            dependencies: storeContext.getDependencies(),

            baseNamespace,
            key,
            modelIndex,

            getContainer: storeContext.getContainer,

            required: createRequiredArg,
          },
          options.args
        );

        state = model.state({
          dependencies: storeContext.getDependencies(),

          baseNamespace,
          key,
          modelIndex,

          args,

          getContainer: storeContext.getContainer,
        });
      }

      const basePath = convertNamespaceToPath(baseNamespace);

      if (key !== undefined) {
        rootState = {
          ...rootState,
          [basePath]: setSubState(
            rootState[basePath],
            modelIndex,
            stateModelsKey,
            key
          ),
        };
      }

      rootState = setSubState(rootState, state, basePath, key);
    });

    return rootState;
  }

  function unregister(rootState: any, optionsList: UnregisterOptions[]) {
    optionsList.forEach((options) => {
      const { baseNamespace, key } = options;

      const models = storeContext.modelsByBaseNamespace.get(baseNamespace);
      if (models == null) {
        throw new Error(
          `Failed to unregister reducer: no model found for namespace "${baseNamespace}"`
        );
      }

      const basePath = convertNamespaceToPath(baseNamespace);

      if (key !== undefined) {
        rootState = {
          ...rootState,
          [basePath]: setSubState(
            rootState[basePath],
            nothingToken,
            stateModelsKey,
            key
          ),
        };
      }

      rootState = setSubState(rootState, nothingToken, basePath, key);
    });

    return rootState;
  }

  function reload(rootState: any, options: ReloadOptions) {
    if (options && options.state !== undefined) {
      return options.state;
    } else {
      return rootState;
    }
  }

  const reduxReducer: ReduxReducer = (rootState, action) => {
    if (rootState === undefined) {
      rootState = {};
    }

    if (reloadActionHelper.is(action)) {
      return reload(rootState, action.payload);
    }

    if (registerActionHelper.is(action)) {
      rootState = register(rootState, action.payload);
    } else if (unregisterActionHelper.is(action)) {
      rootState = unregister(rootState, action.payload);
    }

    const [namespace, actionName] = splitLastPart(action.type);

    const container = storeContext.containerByNamespace.get(namespace);
    if (container == null || !container.isRegistered) {
      return rootState;
    }

    const modelContext = storeContext.contextByModel.get(container.model);
    if (modelContext == null) {
      return rootState;
    }

    const reducer = modelContext.reducerByActionName.get(actionName);
    if (reducer == null) {
      return rootState;
    }

    const { key } = container;
    const { basePath } = modelContext;

    const state = getSubState(rootState, basePath, key);
    const newState = produce(state, (draft: any) => {
      reducer(draft, action.payload, container.reducerContext);
    });

    return setSubState(rootState, newState, basePath, key);
  };

  return (rootState, action) => {
    storeContext.reducerRootState = rootState;
    rootState = reduxReducer(rootState, action);
    storeContext.reducerRootState = nothingToken;
    return rootState;
  };
}
