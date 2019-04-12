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
import { flattenFunctionObject } from "./util";

export interface EpicContext<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
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
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = (
  context: EpicContext<TDependencies, TProps, TState, TGetters, TActionHelpers>
) => Observable<AnyAction>;

export interface Epics<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]:
    | Epic<TDependencies, TProps, TState, TGetters, TActionHelpers>
    | Epics<TDependencies, TProps, TState, TGetters, TActionHelpers>;
}

export type ExtractEpics<T extends Model> = T extends Model<
  any,
  any,
  any,
  any,
  any,
  any,
  infer TEpics
>
  ? TEpics
  : never;

export function createEpicsReduxObservableEpic(
  storeCache: StoreCache,
  container: ContainerImpl<Model>
): ReduxObservableEpic {
  return (rootAction$, rootState$) => {
    const outputObservables = flattenFunctionObject<Epic>(
      container.model.epics
    ).map(({ value: epic }) => {
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
