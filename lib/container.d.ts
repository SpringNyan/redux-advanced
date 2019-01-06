import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { ExtractEffects } from "./effect";
import { ExtractProps, Model } from "./model";
import { ExtractReducers } from "./reducer";
import { ConvertSelectorsToGetters, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
export interface Container<TModel extends Model = any> {
    namespace: string;
    isRegistered: boolean;
    canRegister: boolean;
    state: ExtractState<TModel>;
    getters: ConvertSelectorsToGetters<ExtractSelectors<TModel>>;
    actions: ConvertReducersAndEffectsToActionHelpers<ExtractReducers<TModel>, ExtractEffects<TModel>>;
    register(props?: ExtractProps<TModel>): void;
    unregister(): void;
}
export declare type UseContainer = <TModel extends Model>(model: TModel, key?: string) => Container<TModel>;
export declare class ContainerImpl<TModel extends Model> implements Container<TModel> {
    private readonly _storeId;
    readonly namespace: string;
    private readonly _model;
    private static _nextContainerId;
    private readonly _storeCache;
    private readonly _containerId;
    private readonly _path;
    private _props;
    private _cachedGetters;
    private _cachedActions;
    constructor(_storeId: number, namespace: string, _model: TModel);
    readonly isRegistered: boolean;
    readonly canRegister: boolean;
    readonly state: any;
    readonly getters: ConvertSelectorsToGetters<ExtractSelectors<TModel>>;
    readonly actions: import("./action").ConvertPayloadsToActionHelpers<import("./action").ExtractActionPayloads<ExtractReducers<TModel>> & import("./action").ExtractActionPayloads<ExtractEffects<TModel>>>;
    register(props?: ExtractProps<TModel>): void;
    unregister(): void;
}
