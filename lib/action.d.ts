import { Dispatch } from "redux";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { Effect, Effects, ExtractEffectResult, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
export declare const actionTypes: {
    register: string;
    unregister: string;
};
export interface AnyAction {
    type: string;
    payload?: any;
}
export interface Action<TPayload = any> {
    type: string;
    payload: TPayload;
}
export interface ActionHelper<TPayload = any, TResult = any> {
    type: string;
    is(action: any): action is Action<TPayload>;
    create(payload: TPayload): Action<TPayload>;
    dispatch(payload: TPayload): Promise<TResult>;
}
export interface ActionHelpers {
    [name: string]: ActionHelper | ActionHelpers;
}
export declare type ExtractActionPayload<T extends Action | ActionHelper | Reducer | Effect> = T extends Action<infer TPayload> | ActionHelper<infer TPayload, any> | Reducer<any, any, infer TPayload> | Effect<any, any, any, any, infer TPayload, any> ? TPayload : never;
export declare type ExtractActionHelperResult<T extends ActionHelper> = T extends ActionHelper<any, infer TResult> ? TResult : never;
export declare type ExtractActionHelperPayloadResultPairFromReducers<TReducers extends Reducers> = {
    [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any ? [ExtractActionPayload<TReducers[P]>] : TReducers[P] extends {} ? ExtractActionHelperPayloadResultPairFromReducers<TReducers[P]> : never;
};
export declare type ExtractActionHelperPayloadResultPairFromEffects<TEffects extends Effects> = {
    [P in keyof TEffects]: TEffects[P] extends (...args: any[]) => any ? [ExtractActionPayload<TEffects[P]>, ExtractEffectResult<TEffects[P]>] : TEffects[P] extends {} ? ExtractActionHelperPayloadResultPairFromEffects<TEffects[P]> : never;
};
export declare type ExtractActionHelpersFromPayloadResultPairObject<T> = {
    [P in keyof T]: T[P] extends any[] ? ActionHelper<T[P][0], T[P][1]> : T[P] extends {} ? ExtractActionHelpersFromPayloadResultPairObject<T[P]> : never;
};
export declare type ExtractActionHelpersFromReducersEffects<TReducers extends Reducers, TEffects extends Effects> = ExtractActionHelpersFromPayloadResultPairObject<ExtractActionHelperPayloadResultPairFromReducers<TReducers> & ExtractActionHelperPayloadResultPairFromEffects<TEffects>>;
export declare class ActionHelperImpl<TPayload = any, TResult = any> implements ActionHelper<TPayload, TResult> {
    private readonly _storeContext;
    private readonly _container;
    readonly type: string;
    constructor(_storeContext: StoreContext, _container: ContainerImpl, type: string);
    is(action: any): action is Action<TPayload>;
    create(payload: TPayload): Action<TPayload>;
    dispatch(payload: TPayload, dispatch?: Dispatch): Promise<TResult>;
}
export declare function createActionHelpers<TModel extends Model>(storeContext: StoreContext, container: ContainerImpl<TModel>): ExtractActionHelpersFromReducersEffects<ExtractReducers<TModel>, ExtractEffects<TModel>>;
export declare type ActionHelperDispatch = <TActionHelper extends ActionHelper>(actionHelper: TActionHelper, payload: ExtractActionPayload<TActionHelper>) => Promise<ExtractActionHelperResult<TActionHelper>>;
export declare function createActionHelperDispatch(storeContext: StoreContext, container: ContainerImpl): ActionHelperDispatch;
export interface RegisterPayload {
    namespace?: string;
    model?: number;
    args?: any;
    state?: any;
}
export interface UnregisterPayload {
    namespace?: string;
}
export declare const batchRegisterActionHelper: ActionHelperImpl<RegisterPayload[], void>;
export declare const batchUnregisterActionHelper: ActionHelperImpl<UnregisterPayload[], void>;
export declare function parseBatchRegisterPayloads(action: AnyAction): RegisterPayload[] | null;
export declare function parseBatchUnregisterPayloads(action: AnyAction): UnregisterPayload[] | null;
export declare function createRegisterActionHelper(namespace: string): ActionHelper<RegisterPayload, void>;
export declare function createUnregisterActionHelper(namespace: string): ActionHelper<UnregisterPayload, void>;
