import produce from "immer";
import { Reducer as ReduxReducer } from "redux";

import {
  actionTypes,
  ExtractActionPayload,
  RegisterPayload,
  UnregisterPayload
} from "./action";
import { StoreContext } from "./context";
import { Model } from "./model";
import { getSubState, setSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, splitLastPart } from "./util";

export interface ReducerContext<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any
> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  originalState: TState;
}

export type Reducer<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TPayload = any
> = (
  state: TState,
  payload: TPayload,
  context: ReducerContext<TDependencies, TState>
) => void;

export interface Reducers<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any
> {
  [name: string]:
    | Reducer<TDependencies, TState>
    | Reducers<TDependencies, TState>;
}

export type ExtractReducers<T extends Model> = T extends Model<
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
  TDependencies extends object | undefined,
  TState extends object | undefined
> = {
  [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any
    ? Reducer<TDependencies, TState, ExtractActionPayload<TReducers[P]>>
    : OverrideReducers<TReducers[P], TDependencies, TState>
};

export function createReduxReducer(storeContext: StoreContext): ReduxReducer {
  function register(rootState: any, payloads: RegisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace!;
      const modelIndex = payload.model || 0;

      const { baseNamespace, key, models } = storeContext.findModelsInfo(
        namespace
      )!;
      const basePath = convertNamespaceToPath(baseNamespace);
      const model = models[modelIndex];

      const modelState = model.state({
        dependencies: storeContext.options.dependencies,
        namespace,
        key
      });

      rootState = {
        ...rootState,
        [stateModelsKey]: setSubState(
          rootState[stateModelsKey],
          modelIndex,
          basePath,
          key
        )
      };

      rootState = setSubState(rootState, modelState, basePath, key);
    });

    return rootState;
  }

  function unregister(rootState: any, payloads: UnregisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace!;

      const { baseNamespace, key } = storeContext.findModelsInfo(namespace)!;
      const basePath = convertNamespaceToPath(baseNamespace);

      rootState = {
        ...rootState,
        [stateModelsKey]: setSubState(
          rootState[stateModelsKey],
          undefined,
          basePath,
          key
        )
      };

      rootState = setSubState(rootState, undefined, basePath, key);
    });

    return rootState;
  }

  return (rootState, action) => {
    if (rootState === undefined) {
      rootState = {};
    }

    const [namespace, actionName] = splitLastPart(action.type);

    if (action.type === actionTypes.registered) {
      rootState = register(rootState, action.payload || []);
    } else if (actionName === actionTypes.registered) {
      rootState = register(rootState, [{ ...action.payload, namespace }]);
    }

    if (action.type === actionTypes.unregistered) {
      rootState = unregister(rootState, action.payload || []);
    } else if (actionName === actionTypes.unregistered) {
      rootState = unregister(rootState, [{ ...action.payload, namespace }]);
    }

    const modelsInfo = storeContext.findModelsInfo(namespace);
    if (modelsInfo == null) {
      return rootState;
    }

    const { baseNamespace, key, models } = modelsInfo;
    const basePath = convertNamespaceToPath(baseNamespace);

    const modelIndex = getSubState(rootState[stateModelsKey], basePath, key);
    if (modelIndex == null) {
      return rootState;
    }

    const model = models[modelIndex];
    const modelContext = storeContext.contextByModel.get(model);
    if (modelContext == null) {
      return rootState;
    }

    const reducer = modelContext.reducerByActionName.get(actionName);
    if (reducer == null) {
      return rootState;
    }

    const state = getSubState(rootState, basePath, key);
    const newState = produce(state, (draft: any) => {
      reducer(draft, action.payload, {
        dependencies: storeContext.options.dependencies,
        namespace,
        key,

        originalState: state
      });
    });

    return setSubState(rootState, newState, basePath, key);
  };
}
