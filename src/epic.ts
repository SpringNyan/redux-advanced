import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, takeUntil } from "rxjs/operators";

import { ActionHelpers, AnyAction } from "./action";
import { StoreCache } from "./cache";
import { GetContainer } from "./container";
import { Model } from "./model";
import { Getters } from "./selector";

import { actionTypes } from "./action";
import { ContainerImpl } from "./container";

export interface EpicContext<
  TDependencies extends object = any,
  TProps extends object = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: ActionsObservable<AnyAction>;
  rootState$: StateObservable<unknown>;

  dependencies: TDependencies;
  namespace: string;
  key: string;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Epic<
  TDependencies extends object = any,
  TProps extends object = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = (
  context: EpicContext<TDependencies, TProps, TState, TGetters, TActionHelpers>
) => Observable<AnyAction>;

export type Epics<
  TDependencies extends object = any,
  TProps extends object = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = Array<Epic<TDependencies, TProps, TState, TGetters, TActionHelpers>>;

export function createEpicsReduxObservableEpic(
  storeCache: StoreCache,
  container: ContainerImpl<Model>
): ReduxObservableEpic {
  return (rootAction$, rootState$) => {
    const outputObservables = container.model.epics.map((epic: Epic) => {
      let output$ = epic({
        rootAction$,
        rootState$,

        dependencies: storeCache.dependencies,
        namespace: container.namespace,
        key: container.key,

        getState: () => container.state,
        getters: container.getters,
        actions: container.actions,

        getContainer: storeCache.getContainer
      });

      if (storeCache.options.epicErrorHandler != null) {
        output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
      }

      return output$;
    });

    const takeUntil$ = rootAction$.ofType(
      `${container.namespace}/${actionTypes.unregister}`
    );

    return merge(...outputObservables).pipe(takeUntil(takeUntil$));
  };
}
