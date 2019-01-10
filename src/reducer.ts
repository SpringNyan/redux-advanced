import produce from "immer";
import { Reducer as ReduxReducer } from "redux";

import { StoreCache } from "./cache";
import { Model } from "./model";

import { actionTypes } from "./action";
import { convertNamespaceToPath, parseActionType } from "./util";

export interface ReducerContext<
  TDependencies = any,
  TProps = any,
  TState = any
> {
  dependencies: TDependencies;
  props: TProps;
  key: string | undefined;

  originalState: TState;
}

export type Reducer<
  TDependencies = any,
  TProps = any,
  TState = any,
  TPayload = any
> = (
  state: TState,
  payload: TPayload,
  context: ReducerContext<TDependencies, TProps, TState>
) => void;

export interface Reducers<TDependencies = any, TProps = any, TState = any> {
  [name: string]: Reducer<TDependencies, TProps, TState>;
}

export type ExtractReducers<T extends Model> = T extends Model<
  any,
  any,
  any,
  any,
  infer TReducers,
  any
>
  ? TReducers
  : never;

export function createReduxRootReducer(storeCache: StoreCache): ReduxReducer {
  return (rootState, action) => {
    if (rootState === undefined) {
      rootState = {};
    }

    let initialRootState: { [namespace: string]: any } | undefined;

    storeCache.pendingNamespaces.forEach((_namespace) => {
      const _namespaceCache = storeCache.cacheByNamespace[_namespace];
      if (_namespaceCache == null) {
        return;
      }

      if (rootState[_namespaceCache.path] === undefined) {
        const initialState = _namespaceCache.model.state({
          dependencies: storeCache.dependencies,
          props: _namespaceCache.props,
          key: _namespaceCache.key
        });

        if (initialState !== undefined) {
          if (initialRootState == null) {
            initialRootState = {};
          }

          initialRootState[_namespaceCache.path] = initialState;
        }
      }
    });
    storeCache.pendingNamespaces = [];

    if (initialRootState != null) {
      rootState = {
        ...rootState,
        ...initialRootState
      };
    }

    const actionType = "" + action.type;
    const { namespace, key } = parseActionType(actionType);

    if (key === actionTypes.unregister) {
      rootState = {
        ...rootState
      };
      delete rootState[convertNamespaceToPath(namespace)];
    }

    const namespaceCache = storeCache.cacheByNamespace[namespace];
    if (namespaceCache == null) {
      return rootState;
    }

    const reducer = namespaceCache.model.reducers[key] as Reducer;
    if (reducer == null) {
      return rootState;
    }

    return produce(rootState, (draft) => {
      reducer(draft[namespaceCache.path], action.payload, {
        dependencies: storeCache.dependencies,
        props: namespaceCache.props,
        key: namespaceCache.key,

        originalState: rootState[namespaceCache.path]
      });
    });
  };
}
