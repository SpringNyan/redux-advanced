import { ActionsObservable, Epic as ReduxObservableEpic, StateObservable } from "redux-observable";
import { Observable } from "rxjs";
import { ActionHelpers, AnyAction } from "./action";
import { StoreCache } from "./cache";
import { UseContainer } from "./container";
import { Getters } from "./selector";
export interface EpicContext<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    rootAction$: ActionsObservable<AnyAction>;
    rootState$: StateObservable<unknown>;
    dependencies: TDependencies;
    props: TProps;
    getters: TGetters;
    actions: TActionHelpers;
    useContainer: UseContainer;
    getState: () => TState;
}
export declare type Epic<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> = (context: EpicContext<TDependencies, TProps, TState, TGetters, TActionHelpers>) => Observable<AnyAction>;
export declare type Epics<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> = Array<Epic<TDependencies, TProps, TState, TGetters, TActionHelpers>>;
export declare function createEpicsReduxObservableEpic(storeCache: StoreCache, namespace: string): ReduxObservableEpic;
