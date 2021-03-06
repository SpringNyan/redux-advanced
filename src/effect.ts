import { Observable } from "rxjs";
import {
  ActionHelpers,
  AnyAction,
  ExtractActionDispatchResult,
  ExtractActionPayload,
} from "./action";
import { GetContainer } from "./container";
import { Model } from "./model";
import { Getters } from "./selector";

export interface EffectContext<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: Observable<AnyAction>;
  rootState$: Observable<any>;

  dependencies: TDependencies;

  baseNamespace: string;
  key: string | undefined;
  modelIndex: number | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Effect<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TPayload = any,
  TResult = any
> = (
  context: EffectContext<TDependencies, TState, TGetters, TActionHelpers>,
  payload: TPayload
) => Promise<TResult>;

export interface Effects<
  TDependencies = any,
  TState extends object = any,
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
  any,
  infer TEffects,
  any
>
  ? TEffects
  : never;

export type OverrideEffects<
  TEffects,
  TDependencies,
  TState extends object,
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
        ExtractActionDispatchResult<TEffects[P]>
      >
    : OverrideEffects<
        TEffects[P],
        TDependencies,
        TState,
        TGetters,
        TActionHelpers
      >;
};

export type LooseEffects<TEffects> = {
  [P in keyof TEffects]: TEffects[P] extends (...args: any[]) => any
    ? Effect<
        any,
        any,
        any,
        any,
        ExtractActionPayload<TEffects[P]>,
        ExtractActionDispatchResult<TEffects[P]>
      >
    : LooseEffects<TEffects[P]>;
};
