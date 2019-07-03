import { Model } from "./model";

export interface StateContext<TDependencies extends object | undefined = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string;
}

export type StateFactory<
  TDependencies extends object | undefined,
  TState extends object | undefined
> = (context: StateContext<TDependencies>) => TState;

export type ExtractState<T extends Model> = T extends Model<
  any,
  infer TState,
  any,
  any,
  any,
  any
>
  ? TState
  : never;
