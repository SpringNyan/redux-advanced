import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable,
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, filter, takeUntil } from "rxjs/operators";
import { ActionHelpers, AnyAction, unregisterActionHelper } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
import { Getters } from "./selector";
import { assignObjectDeeply } from "./util";

export interface EpicContext<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: ActionsObservable<AnyAction>;
  rootState$: StateObservable<any>;

  dependencies: TDependencies;

  baseNamespace: string;
  key: string | undefined;
  modelIndex: number | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Epic<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = (
  context: EpicContext<TDependencies, TState, TGetters, TActionHelpers>
) => Observable<AnyAction>;

export interface Epics<
  TDependencies = any,
  TState extends object = any,
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
  TDependencies,
  TState extends object,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TEpics]: TEpics[P] extends (...args: any[]) => any
    ? Epic<TDependencies, TState, TGetters, TActionHelpers>
    : OverrideEpics<TEpics[P], TDependencies, TState, TGetters, TActionHelpers>;
};

export function createReduxObservableEpic(
  storeContext: StoreContext,
  container: ContainerImpl
): ReduxObservableEpic {
  return (rootAction$, rootState$) => {
    container.epicContext.rootAction$ = rootAction$;
    container.epicContext.rootState$ = rootState$;

    const outputObservables: Array<Observable<AnyAction>> = [];

    assignObjectDeeply({}, container.model.epics, (epic: Epic) => {
      const output$ = epic(container.epicContext).pipe(
        catchError((error, caught) => {
          storeContext.onUnhandledEpicError(error);
          return caught;
        })
      );

      outputObservables.push(output$);
    });

    const takeUntil$ = rootAction$.pipe(
      filter((action) => {
        if (unregisterActionHelper.is(action)) {
          return action.payload.some(
            (payload) =>
              payload.baseNamespace === container.baseNamespace &&
              payload.key === container.key
          );
        }

        return false;
      })
    );

    return merge(...outputObservables).pipe(takeUntil(takeUntil$));
  };
}
