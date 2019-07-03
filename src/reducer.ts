import produce from "immer";
import { Reducer as ReduxReducer } from "redux";

import { ExtractActionPayload } from "./action";
import { StoreCache } from "./cache";
import { Model } from "./model";

import { actionTypes } from "./action";
import { convertNamespaceToPath, merge, parseActionType } from "./util";

export interface ReducerContext<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any
> {
  dependencies: TDependencies;
  namespace: string;
  key: string;

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

export function createRootReduxReducer(storeCache: StoreCache): ReduxReducer {
  return (rootState, action) => {
    if (rootState === undefined) {
      rootState = {};
    }

    let initialRootState: { [namespace: string]: any } | undefined;

    storeCache.pendingInitStates.forEach(
      ({ namespace: _namespace, state: _state }) => {
        const _container = storeCache.containerByNamespace.get(_namespace);
        if (_container == null) {
          return;
        }

        if (rootState[_container.path] === undefined) {
          const initialState = _container.model.state({
            dependencies: storeCache.dependencies,
            namespace: _container.namespace,
            key: _container.key
          });

          if (initialState !== undefined || _state !== undefined) {
            if (initialRootState == null) {
              initialRootState = {};
            }

            initialRootState[_container.path] = merge({}, initialState, _state);
          }
        }
      }
    );
    storeCache.pendingInitStates.length = 0;

    if (initialRootState != null) {
      rootState = {
        ...rootState,
        ...initialRootState
      };
    }

    const { namespace, actionName } = parseActionType(action.type);

    if (actionName === actionTypes.unregister) {
      rootState = {
        ...rootState
      };
      delete rootState[convertNamespaceToPath(namespace)];
    }

    const container = storeCache.containerByNamespace.get(namespace);
    if (container == null) {
      return rootState;
    }

    const modelContext = storeCache.contextByModel.get(container.model);
    const reducer = modelContext
      ? modelContext.reducerByActionName[actionName]
      : null;
    if (reducer == null) {
      return rootState;
    }

    const state = rootState[container.path];
    const newState = produce(state, (draft: any) => {
      reducer(draft, action.payload, {
        dependencies: storeCache.dependencies,
        namespace: container.namespace,
        key: container.key,

        originalState: state
      });
    });

    if (newState !== state) {
      return {
        ...rootState,
        [container.path]: newState
      };
    } else {
      return rootState;
    }
  };
}
