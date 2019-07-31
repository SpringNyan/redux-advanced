import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, filter, takeUntil } from "rxjs/operators";

import {
  ActionHelpers,
  AnyAction,
  batchUnregisterActionHelper,
  createUnregisterActionHelper
} from "./action";
import { ContainerDispatch, ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
import { Getters } from "./selector";
import { mapObjectDeeply } from "./util";

export interface EpicContext<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: ActionsObservable<AnyAction>;
  rootState$: StateObservable<any>;

  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;

  dispatch: ContainerDispatch;
}

export type Epic<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = (
  context: EpicContext<TDependencies, TState, TGetters, TActionHelpers>
) => Observable<AnyAction>;

export interface Epics<
  TDependencies extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]:
    | Epic<TDependencies, TState, TGetters, TActionHelpers>
    | Epics<TDependencies, TState, TGetters, TActionHelpers>;
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

export type OverrideEpics<
  TEpics,
  TDependencies extends object | undefined,
  TState extends object | undefined,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TEpics]: TEpics[P] extends (...args: any[]) => any
    ? Epic<TDependencies, TState, TGetters, TActionHelpers>
    : OverrideEpics<TEpics[P], TDependencies, TState, TGetters, TActionHelpers>
};

export function createReduxObservableEpic(
  storeContext: StoreContext,
  container: ContainerImpl
): ReduxObservableEpic {
  return (rootAction$, rootState$) => {
    const outputObservables: Array<Observable<AnyAction>> = [];

    mapObjectDeeply({}, container.model.epics, (epic) => {
      let output$ = epic({
        rootAction$,
        rootState$,

        dependencies: storeContext.options.dependencies,
        namespace: container.namespace,
        key: container.key,

        getState: () => container.state,
        getters: container.getters,
        actions: container.actions,

        getContainer: storeContext.getContainer,

        dispatch: container.dispatch
      });

      if (storeContext.options.defaultEpicErrorHandler != null) {
        output$ = output$.pipe(
          catchError(storeContext.options.defaultEpicErrorHandler)
        );
      }

      outputObservables.push(output$);
    });

    const unregisterActionHelper = createUnregisterActionHelper(
      container.namespace
    );

    const takeUntil$ = rootAction$.pipe(
      filter((action) => {
        if (unregisterActionHelper.is(action)) {
          return true;
        }

        if (batchUnregisterActionHelper.is(action)) {
          return (action.payload || []).some(
            (payload) => payload.namespace === container.namespace
          );
        }

        return false;
      })
    );

    return merge(...outputObservables).pipe(takeUntil(takeUntil$));
  };
}
