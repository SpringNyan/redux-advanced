import { Dispatch } from "redux";
import { ActionsObservable, Epic as ReduxObservableEpic, StateObservable } from "redux-observable";
import { Observable } from "rxjs";
import { ActionHelpers, AnyAction } from "./action";
import { StoreCache } from "./cache";
import { UseContainer } from "./container";
import { Model } from "./model";
import { Getters } from "./selector";
export declare type EffectDispatch = (dispatch: Dispatch<AnyAction>) => Promise<void>;
export interface EffectContext<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
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
export declare type Effect<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any, TPayload = any> = (context: EffectContext<TDependencies, TProps, TState, TGetters, TActionHelpers>, payload: TPayload) => EffectDispatch;
export interface Effects<TDependencies = any, TProps = any, TState = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    [name: string]: Effect<TDependencies, TProps, TState, TGetters, TActionHelpers>;
}
export declare type ExtractEffects<T extends Model> = T extends Model<any, any, any, any, any, infer TEffects> ? TEffects : never;
export declare function toActionObservable(effectDispatch: EffectDispatch): Observable<AnyAction>;
export declare function createEffectsReduxObservableEpic(storeCache: StoreCache, namespace: string): ReduxObservableEpic;
