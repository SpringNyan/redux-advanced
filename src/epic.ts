import {
  ActionsObservable,
  Epic as ReduxObservableEpic,
  StateObservable
} from "redux-observable";
import { merge, Observable } from "rxjs";
import { catchError, takeUntil } from "rxjs/operators";

import { ActionHelpers, AnyAction } from "./action";
import { StoreCache } from "./cache";
import { UseContainer } from "./container";
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

  dependencies: TDependencies;
  props: TProps;
  getters: TGetters;
  actions: TActionHelpers;

  useContainer: UseContainer;

  getState: () => TState;
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

        dependencies: storeCache.dependencies,
        props: namespaceCache.props,
        getters: namespaceCache.container.getters,
        actions: namespaceCache.container.actions,

        useContainer: storeCache.useContainer,

        getState: () => rootState$.value[namespaceCache.path]
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
