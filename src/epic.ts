import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, takeUntil } from "rxjs/operators";

import {
  ActionHelpers,
  AnyAction,
  ConvertActionHelpersToStrictActionHelpers
} from "./action";
import { StoreCache } from "./cache";
import { UseStrictContainer } from "./container";
import { Getters } from "./selector";

import { actionTypes } from "./action";

export interface EpicContext<
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
  key: string | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: ConvertActionHelpersToStrictActionHelpers<TActionHelpers>;

  useContainer: UseStrictContainer;
}

export type Epic<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = (
  context: EpicContext<TDependencies, TProps, TState, TGetters, TActionHelpers>
) => Observable<AnyAction>;

export type Epics<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> = Array<Epic<TDependencies, TProps, TState, TGetters, TActionHelpers>>;

export function createEpicsReduxObservableEpic(
  storeCache: StoreCache,
  namespace: string
): ReduxObservableEpic {
  const namespaceCache = storeCache.cacheByNamespace[namespace];

  return (rootAction$, rootState$) => {
    const outputObservables = namespaceCache.model.epics.map((epic: Epic) => {
      let output$ = epic({
        rootAction$,
        rootState$,

        namespace,

        dependencies: storeCache.dependencies,
        props: namespaceCache.props,
        key: namespaceCache.key,

        getState: () => rootState$.value[namespaceCache.path],
        getters: namespaceCache.container.getters,
        actions: namespaceCache.container.actions,

        useContainer: storeCache.useContainer as UseStrictContainer
      });

      if (storeCache.options.epicErrorHandler != null) {
        output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
      }

      return output$;
    });

    const takeUntil$ = rootAction$.ofType(
      `${namespace}/${actionTypes.unregister}`
    );

    return merge(...outputObservables).pipe(takeUntil(takeUntil$));
  };
}
