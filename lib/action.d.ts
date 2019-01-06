import { Dispatch } from "redux";
import { StoreCache } from "./cache";
import { Effect, Effects, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
export declare const actionTypes: {
    register: string;
    epicEnd: string;
    unregister: string;
};
export interface AnyAction {
    type: string;
}
export interface Action<TPayload = any> {
    type: string;
    payload: TPayload;
}
export interface ActionHelper<TPayload = any> {
    type: string;
    is(action: any): action is Action<TPayload>;
    create(payload: TPayload): Action<TPayload>;
    dispatch(payload: TPayload, dispatch?: Dispatch): Promise<void>;
}
export interface ActionHelpers {
    [name: string]: ActionHelper;
}
export declare type ExtractActionPayload<T extends Action | Reducer | Effect> = T extends Action<infer TPayload> | Reducer<any, any, any, infer TPayload> | Effect<any, any, any, any, any, infer TPayload> ? TPayload : never;
export declare type ExtractActionPayloads<T extends Reducers | Effects> = {
    [P in keyof T]: ExtractActionPayload<T[P]>;
};
export declare type ConvertPayloadsToActionHelpers<TPayloads> = {
    [P in keyof TPayloads]: ActionHelper<TPayloads[P]>;
};
export declare type ConvertReducersAndEffectsToActionHelpers<TReducers extends Reducers, TEffects extends Effects> = ConvertPayloadsToActionHelpers<ExtractActionPayloads<TReducers> & ExtractActionPayloads<TEffects>>;
export declare class ActionHelperImpl<TPayload> implements ActionHelper<TPayload> {
    private readonly _storeCache;
    readonly type: string;
    constructor(_storeCache: StoreCache, type: string);
    is(action: any): action is Action<TPayload>;
    create(payload: TPayload): Action<TPayload>;
    dispatch(payload: TPayload, dispatch?: Dispatch): Promise<void>;
}
export declare function createActionHelpers<TModel extends Model>(storeCache: StoreCache, namespace: string): ConvertReducersAndEffectsToActionHelpers<ExtractReducers<TModel>, ExtractEffects<TModel>>;
