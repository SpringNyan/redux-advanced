import { Model } from "./model";

export interface StateContext<
  TDependencies extends object = any,
  TProps extends object = any
> {
  dependencies: TDependencies;
  props: TProps;
  key: string;
}

export type StateFactory<
  TDependencies extends object,
  TProps extends object,
  TState extends object
> = (context: StateContext<TDependencies, TProps>) => TState;

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
