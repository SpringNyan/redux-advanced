import { Dispatch } from "redux";
import { Observable } from "rxjs";

import {
  ActionHelper,
  ActionHelpers,
  AnyAction,
  ExtractActionHelperResult,
  ExtractActionPayload
} from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
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
  dispatch: EffectDispatch;
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

export type EffectDispatch = (<TPayload>(
  payload: TPayload extends ActionHelper ? never : TPayload
) => TPayload) &
  (<TActionHelper extends ActionHelper>(
    actionHelper: TActionHelper,
    payload: ExtractActionPayload<TActionHelper>
  ) => Promise<ExtractActionHelperResult<TActionHelper>>);

export function createEffectDispatch(
  storeContext: StoreContext,
  container: ContainerImpl
): EffectDispatch {
  const dispatch: Dispatch = (action) => {
    if (effectDispatch === container.cache.cachedDispatch) {
      storeContext.store.dispatch(action);
    }

    return action;
  };

  const effectDispatch: EffectDispatch = (arg1: any, arg2?: any) => {
    const actionHelper = arg1 as ActionHelper;
    if (actionHelper && typeof actionHelper.dispatch === "function") {
      return actionHelper.dispatch(arg2, dispatch);
    } else {
      return dispatch(arg1);
    }
  };

  return effectDispatch;
}
