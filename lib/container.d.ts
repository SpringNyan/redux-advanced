import { ExtractActionHelpersFromReducersEffects } from "./action";
import { ExtractArgs } from "./args";
import { StoreContext } from "./context";
import { EffectDispatch, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import { ExtractGettersFromSelectors, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
export interface Container<TModel extends Model = any> {
    namespace: string;
    key: string | undefined;
    isRegistered: boolean;
    canRegister: boolean;
    state: ExtractState<TModel>;
    getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
    actions: ExtractActionHelpersFromReducersEffects<ExtractReducers<TModel>, ExtractEffects<TModel>>;
    register(args?: ExtractArgs<TModel>): void;
    unregister(): void;
}
export declare type GetContainer = (<TModel extends Model>(model: TModel) => Container<TModel>) & (<TModel extends Model>(model: TModel, key: string) => Container<TModel>);
export declare class ContainerImpl<TModel extends Model = Model> implements Container<TModel> {
    private readonly _storeContext;
    readonly model: TModel;
    readonly key: string | undefined;
    static nextId: number;
    readonly id: number;
    readonly namespace: string;
    readonly baseNamespace: string;
    readonly basePath: string;
    constructor(_storeContext: StoreContext, model: TModel, key: string | undefined);
    readonly cache: {
        cachedArgs: any;
        cachedState: any;
        cachedGetters: any;
        cachedActions: any;
        cachedDispatch: any;
        selectorCacheByPath: Map<string, import("./selector").SelectorCache>;
    };
    readonly isRegistered: boolean;
    readonly canRegister: boolean;
    readonly state: any;
    readonly getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
    readonly actions: ExtractActionHelpersFromReducersEffects<ExtractReducers<TModel>, ExtractEffects<TModel>>;
    readonly dispatch: EffectDispatch;
    register(args?: ExtractArgs<TModel>): void;
    unregister(): void;
    clearCache(): void;
}
export declare function createGetContainer(storeContext: StoreContext): GetContainer;
