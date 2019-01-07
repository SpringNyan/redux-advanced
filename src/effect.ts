import { Dispatch } from "redux";
import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, mergeMap, takeUntil } from "rxjs/operators";

import { Action, ActionHelpers, AnyAction } from "./action";
import { StoreCache } from "./cache";
import { UseContainer } from "./container";
import { Model } from "./model";
import { Getters } from "./selector";

import { actionTypes } from "./action";

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

  namespace: string;

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

export function createEffectsReduxObservableEpic(
  storeCache: StoreCache,
  namespace: string
): ReduxObservableEpic {
  const namespaceCache = storeCache.cacheByNamespace[namespace];

  return (rootAction$, rootState$) => {
    const outputObservables = Object.keys(namespaceCache.model.effects).map(
      (key) => {
        const effect = namespaceCache.model.effects[key] as Effect;

        let output$ = rootAction$.ofType(`${namespace}/${key}`).pipe(
          mergeMap((action: Action) => {
            const effectDispatchHandler = storeCache.effectDispatchHandlerByAction.get(
              action
            );
            if (effectDispatchHandler != null) {
              effectDispatchHandler.hasEffect = true;
            }

            const effectDispatch = effect(
              {
                rootAction$,
                rootState$,

                namespace,

                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                getters: namespaceCache.container.getters,
                actions: namespaceCache.container.actions,

                useContainer: storeCache.useContainer,

                getState: () => rootState$.value[namespaceCache.path]
              },
              action.payload
            );

            const wrappedEffectDispatch = (dispatch: Dispatch) => {
              const promise = effectDispatch(dispatch);
              promise.then(
                () => {
                  if (effectDispatchHandler != null) {
                    effectDispatchHandler.resolve();
                  }
                },
                (err) => {
                  if (effectDispatchHandler != null) {
                    effectDispatchHandler.reject(err);
                  }
                }
              );
              return promise;
            };

            return toActionObservable(wrappedEffectDispatch);
          })
        );

        if (storeCache.options.epicErrorHandler != null) {
          output$ = output$.pipe(
            catchError(storeCache.options.epicErrorHandler)
          );
        }

        return output$;
      }
    );

    const takeUntil$ = rootAction$.ofType(
      `${namespace}/${actionTypes.unregister}`
    );

    return merge(...outputObservables).pipe(takeUntil(takeUntil$));
  };
}
