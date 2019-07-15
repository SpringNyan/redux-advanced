import { Observable } from "rxjs";

import { ActionHelpers, AnyAction, ExtractActionPayload } from "./action";
import { GetContainer } from "./container";
import { Model } from "./model";
import { Getters } from "./selector";

export interface EffectContext<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: Observable<AnyAction>;
  rootState$: Observable<any>;

  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Effect<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TPayload = any,
  TResult = any
> = (
  context: EffectContext<TDependencies, TState, TGetters, TActionHelpers>,
  payload: TPayload
) => Promise<TResult>;

export interface Effects<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]:
    | Effect<TDependencies, TState, TGetters, TActionHelpers>
    | Effects<TDependencies, TState, TGetters, TActionHelpers>;
}

export type ExtractEffects<T extends Model> = T extends Model<
  any,
  any,
  any,
  any,
  infer TEffects,
  any
>
  ? TEffects
  : never;

export type ExtractEffectResult<T extends Effect> = T extends Effect<
  any,
  any,
  any,
  any,
  any,
  infer TResult
>
  ? TResult
  : never;

export type OverrideEffects<
  TEffects,
  TDependencies extends object | undefined,
  TState extends object | undefined,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TEffects]: TEffects[P] extends (...args: any[]) => any
    ? Effect<
        TDependencies,
        TState,
        TGetters,
        TActionHelpers,
        ExtractActionPayload<TEffects[P]>,
        ExtractEffectResult<TEffects[P]>
      >
    : OverrideEffects<
        TEffects[P],
        TDependencies,
        TState,
        TGetters,
        TActionHelpers
      >
};
