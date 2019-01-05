import { Dispatch } from "redux";
import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { empty, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { ActionHelpers, AnyAction } from "./action";
import { Model } from "./model";
import { Getters } from "./selector";

import { getStoreCache } from "./cache";
import { UseContainer } from "./container";
import { parseActionType } from "./util";

export type EffectDispatch = (dispatch: Dispatch<AnyAction>) => Promise<void>;

export interface EffectContext<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: ActionsObservable<AnyAction>;
  rootState$: StateObservable<unknown>;

  dependencies: TDependencies;
  props: TProps;
  getters: TGetters;
  actions: TActionHelpers;

  useContainer: UseContainer;

  getState: () => TState;
}

export type Effect<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TPayload = any
> = (
  context: EffectContext<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >,
  payload: TPayload
) => EffectDispatch;

export interface Effects<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]: Effect<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >;
}

export type ExtractEffects<T extends Model> = T extends Model<
  any,
  any,
  any,
  any,
  any,
  infer TEffects
>
  ? TEffects
  : never;

export function toActionObservable(
  effectDispatch: EffectDispatch
): Observable<AnyAction> {
  return new Observable((subscribe) => {
    const dispatch: Dispatch = (action) => {
      subscribe.next(action);
      return action;
    };
    effectDispatch(dispatch).then(
      () => subscribe.complete(),
      (reason) => subscribe.error(reason)
    );
  });
}

export function createEffectReduxObservableEpic(
  storeId: number
): ReduxObservableEpic {
  const storeCache = getStoreCache(storeId);

  return (rootAction$, rootState$) =>
    rootAction$.pipe(
      mergeMap((action) => {
        const actionType = "" + action.type;
        const { namespace, key } = parseActionType(actionType);

        const namespaceCache = storeCache.cacheByNamespace[namespace];
        if (namespaceCache == null) {
          return empty();
        }

        const effect = namespaceCache.model.effects[key] as Effect;
        if (effect == null) {
          return empty();
        }

        const effectDispatch = effect(
          {
            rootAction$,
            rootState$,

            dependencies: storeCache.dependencies,
            props: namespaceCache.props,
            getters: namespaceCache.container.getters,
            actions: namespaceCache.container.actions,

            useContainer: storeCache.useContainer,

            getState: () => rootState$.value[namespaceCache.path]
          },
          action.payload
        );

        return toActionObservable(effectDispatch);
      })
    );
}
