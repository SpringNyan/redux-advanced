import { GetContainer } from "./container";
import { Model } from "./model";
import { DeepRequired, isObject, nothingToken } from "./util";

export const stateModelsKey = "@@models";

export interface StateContext<TDependencies = any, TArgs extends object = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  args: StateArgs<TArgs>;

  getContainer: GetContainer;
}

export type StateFactory<
  TDependencies,
  TArgs extends object,
  TState extends object
> = (context: StateContext<TDependencies, TArgs>) => TState;

export type ExtractState<T extends Model> = T extends Model<
  any,
  any,
  infer TState,
  any,
  any,
  any,
  any
>
  ? TState
  : never;

export type StateArgs<TArgs> = TArgs extends object
  ? DeepRequired<TArgs>
  : TArgs;

export function getSubState(
  rootState: any,
  basePath: string,
  key: string | undefined
) {
  if (!isObject(rootState)) {
    throw new Error(`Failed to get sub state: rootState is not an object`);
  }

  let state = rootState[basePath];
  if (key === undefined) {
    return state;
  }

  if (!isObject(state)) {
    throw new Error(`Failed to get sub state: state is not an object`);
  }
  state = state[key];

  return state;
}

export function setSubState(
  rootState: any,
  value: any,
  basePath: string,
  key: string | undefined
): any {
  if (rootState === undefined) {
    rootState = {};
  }
  if (!isObject(rootState)) {
    throw new Error(`Failed to set sub state: rootState is not an object`);
  }

  if (key === undefined) {
    if (rootState[basePath] === value) {
      return rootState;
    }

    rootState = { ...rootState };
    if (value === nothingToken) {
      delete rootState[basePath];
    } else {
      rootState[basePath] = value;
    }

    return rootState;
  } else {
    const state = setSubState(rootState[basePath], value, key, undefined);
    if (rootState[basePath] === state) {
      return rootState;
    }

    return {
      ...rootState,
      [basePath]: state,
    };
  }
}
