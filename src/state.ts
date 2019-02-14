import { Model } from "./model";

export interface StateContext<TDependencies = any, TProps = any> {
  dependencies: TDependencies;
  props: TProps;
  key: string;
}

export type StateFactory<TDependencies, TProps, TState> = (
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
