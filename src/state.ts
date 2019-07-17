import { Model } from "./model";

export const stateModelsKey = "__models";

export interface StateContext<
  TDependencies extends object | undefined = any,
  TArgs extends object | undefined = any
> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  args: TArgs | undefined;
}

export type StateFactory<
  TDependencies extends object | undefined,
  TArgs extends object | undefined,
  TState extends object | undefined
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

export function getSubState(
  rootState: any,
  basePath: string,
  key: string | undefined
) {
  if (rootState == null) {
    return undefined;
  }

  let state = rootState[basePath];
  if (key === undefined) {
    return state;
  }

  if (state == null) {
    return undefined;
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
  if (rootState == null) {
    rootState = {};
  }

  if (key === undefined) {
    if (rootState[basePath] === value) {
      return rootState;
    }

    rootState = { ...rootState };
    if (value === undefined) {
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
      [basePath]: state
    };
  }
}
