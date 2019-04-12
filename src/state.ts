import { Model } from "./model";

export interface StateContext<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any
> {
  dependencies: TDependencies;
  props: TProps;
  key: string;
}

export type StateFactory<
  TDependencies extends object | undefined,
  TProps extends object | undefined,
  TState extends object | undefined
> = (context: StateContext<TDependencies, TProps>) => TState;

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
