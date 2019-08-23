import { ActionsObservable, Epic as ReduxObservableEpic, StateObservable } from "redux-observable";
import { Observable } from "rxjs";
import { ActionHelpers, AnyAction } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
import { Getters } from "./selector";
export interface EpicContext<TDependencies = any, TState extends object = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    rootAction$: ActionsObservable<AnyAction>;
    rootState$: StateObservable<any>;
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    getState: () => TState;
    getters: TGetters;
    actions: TActionHelpers;
    getContainer: GetContainer;
}
export declare type Epic<TDependencies = any, TState extends object = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> = (context: EpicContext<TDependencies, TState, TGetters, TActionHelpers>) => Observable<AnyAction>;
export interface Epics<TDependencies = any, TState extends object = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    [name: string]: Epic<TDependencies, TState, TGetters, TActionHelpers> | Epics<TDependencies, TState, TGetters, TActionHelpers>;
}
export declare type ExtractEpics<T extends Model> = T extends Model<any, any, any, any, any, any, infer TEpics> ? TEpics : never;
export declare type OverrideEpics<TEpics, TDependencies, TState extends object, TGetters extends Getters, TActionHelpers extends ActionHelpers> = {
    [P in keyof TEpics]: TEpics[P] extends (...args: any[]) => any ? Epic<TDependencies, TState, TGetters, TActionHelpers> : OverrideEpics<TEpics[P], TDependencies, TState, TGetters, TActionHelpers>;
};
export declare function createReduxObservableEpic(storeContext: StoreContext, container: ContainerImpl): ReduxObservableEpic;
