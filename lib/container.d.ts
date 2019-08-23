import { ExtractActionHelpersFromReducersEffects } from "./action";
import { ExtractArgs } from "./args";
import { StoreContext } from "./context";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import { ExtractGettersFromSelectors, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
export interface Container<TModel extends Model = any> {
    namespace: string;
    key: string | undefined;
    getState: () => ExtractState<TModel>;
    getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
    actions: ExtractActionHelpersFromReducersEffects<ExtractReducers<TModel>, ExtractEffects<TModel>>;
    isRegistered: boolean;
    canRegister: boolean;
    register(args?: ExtractArgs<TModel>): void;
    unregister(): void;
}
export declare class ContainerImpl<TModel extends Model = Model> implements Container<TModel> {
    private readonly _storeContext;
    readonly model: TModel;
    readonly key: string | undefined;
    readonly namespace: string;
    private readonly _modelContext;
    private _cachedArgs;
    private _cachedState;
    private _cachedGetters;
    private _cachedActions;
    private _getStateCache;
    constructor(_storeContext: StoreContext, model: TModel, key: string | undefined);
    readonly isRegistered: boolean;
    readonly canRegister: boolean;
    getRootState(): any;
    getState(): any;
    readonly getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
    readonly actions: ExtractActionHelpersFromReducersEffects<ExtractReducers<TModel>, ExtractEffects<TModel>>;
    register(args?: ExtractArgs<TModel>): void;
    unregister(): void;
    private _getCurrentContainer;
}
export interface GetContainer {
    <TModel extends Model>(model: TModel): Container<TModel>;
    <TModel extends Model>(model: TModel, key: string): Container<TModel>;
}
export declare function createGetContainer(storeContext: StoreContext): GetContainer;
