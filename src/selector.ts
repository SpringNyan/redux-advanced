import { ActionHelpers } from "./action";
import { Model } from "./model";

export interface SelectorContext<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  dependencies: TDependencies;
  props: TProps;
  state: TState;
  getters: TGetters;
  actions: TActionHelpers;
}

export type Selector<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> = (
  context: SelectorContext<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >
) => TResult;

export interface Selectors<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]: Selector<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >;
}

export interface Getters {
  [name: string]: any;
}

export type ExtractSelectorResult<T extends Selector> = T extends Selector<
  any,
  any,
  any,
  any,
  any,
  infer TResult
>
  ? TResult
  : never;

export type ConvertSelectorsToGetters<TSelectors extends Selectors> = {
  [P in keyof TSelectors]: ExtractSelectorResult<TSelectors[P]>
};

export type ExtractSelectors<T extends Model> = T extends Model<
  any,
  any,
  any,
  infer TSelectors,
  any,
  any
>
  ? TSelectors
  : never;
