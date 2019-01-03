import { Model } from "./model";

export interface StateContext<TDependencies = any, TProps = any> {
  dependencies: TDependencies;
  props: TProps;
}

export type StateFactory<TDependencies = any, TProps = any, TState = any> = (
  context: StateContext<TDependencies, TProps>
) => TState;

export type ExtractState<T extends Model> = T extends Model<
  any,
  any,
  infer TState,
  any,
  any,
  any
>
  ? TState
  : never;
