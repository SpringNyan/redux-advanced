import { ActionsObservable, StateObservable } from "redux-observable";
import { Observable } from "rxjs";

import { ActionHelpers, AnyAction } from "./action";
import { UseContainer } from "./container";
import { Getters } from "./selector";

export interface EpicContext<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  action$: ActionsObservable<AnyAction>;
  rootAction$: ActionsObservable<AnyAction>;
  state$: StateObservable<TState>;
  rootState$: StateObservable<unknown>;

  dependencies: TDependencies;
  props: TProps;
  getters: TGetters;
  actions: TActionHelpers;

  useContainer: UseContainer;
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
