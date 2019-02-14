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
  key: string;

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

export function createRootReduxReducer(storeCache: StoreCache): ReduxReducer {
  return (rootState, action) => {
    if (rootState === undefined) {
      rootState = {};
    }

    let initialRootState: { [namespace: string]: any } | undefined;

    storeCache.initStateNamespaces.forEach((_namespace) => {
      const _container = storeCache.containerByNamespace.get(_namespace);
      if (_container == null) {
        return;
      }

      if (rootState[_container.path] === undefined) {
        const initialState = _container.model.state({
          dependencies: storeCache.dependencies,
          props: _container.props,
          key: _container.key
        });

        if (initialState !== undefined) {
          if (initialRootState == null) {
            initialRootState = {};
          }

          initialRootState[_container.path] = initialState;
        }
      }
    });
    storeCache.initStateNamespaces = [];

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

    const container = storeCache.containerByNamespace.get(namespace);
    if (container == null) {
      return rootState;
    }

    const reducer = container.model.reducers[key] as Reducer;
    if (reducer == null) {
      return rootState;
    }

    return produce(rootState, (draft) => {
      reducer(draft[container.path], action.payload, {
        dependencies: storeCache.dependencies,
        props: container.props,
        key: container.key,

        originalState: rootState[container.path]
      });
    });
  };
}
