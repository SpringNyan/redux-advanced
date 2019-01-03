import { Model } from "./model";

export interface ReducerContext<
  TDependencies = any,
  TProps = any,
  TState = any
> {
  dependencies: TDependencies;
  props: TProps;
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
