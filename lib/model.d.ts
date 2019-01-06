import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { Effects } from "./effect";
import { Epics } from "./epic";
import { Reducers } from "./reducer";
import { ConvertSelectorsToGetters, Selectors, SelectorsFactory } from "./selector";
import { StateFactory } from "./state";
export interface Model<TDependencies = any, TProps = any, TState = any, TSelectors extends Selectors<TDependencies, TProps> = any, TReducers extends Reducers<TDependencies, TProps> = any, TEffects extends Effects<TDependencies, TProps> = any> {
    defaultProps: TProps;
    state: StateFactory<TDependencies, TProps, TState>;
    selectors: TSelectors;
    reducers: TReducers;
    effects: TEffects;
    epics: Epics<TDependencies, TProps, TState, ConvertSelectorsToGetters<TSelectors>, ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>>;
}
export interface Models<TDependencies = any> {
    [key: string]: Model<TDependencies> | Array<Model<TDependencies>> | Models<TDependencies>;
}
export declare type ExtractDependencies<T extends Model> = T extends Model<infer TDependencies, any, any, any, any, any> ? TDependencies : never;
export declare type ExtractProps<T extends Model> = T extends Model<any, infer TProps, any, any, any, any> ? TProps : never;
export declare class ModelBuilder<TDependencies = any, TProps = any, TState = any, TSelectors extends Selectors<TDependencies, TProps> = any, TReducers extends Reducers<TDependencies, TProps> = any, TEffects extends Effects<TDependencies, TProps> = any> {
    private readonly _model;
    private _isFrozen;
    constructor(model: Model<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>);
    freeze(): ModelBuilder<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>;
    clone(): ModelBuilder<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>;
    dependencies<T>(): ModelBuilder<TDependencies & T, TProps, TState, TSelectors, TReducers, TEffects>;
    props<T>(defaultProps: T): ModelBuilder<TDependencies, TProps & T, TState, TSelectors, TReducers, TEffects>;
    state<T>(state: T | StateFactory<TDependencies, TProps, T>): ModelBuilder<TDependencies, TProps, TState & T, TSelectors, TReducers, TEffects>;
    selectors<T extends Selectors<TDependencies, TProps, TState, ConvertSelectorsToGetters<TSelectors>, ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>>>(selectors: T | SelectorsFactory<TDependencies, TProps, TState, ConvertSelectorsToGetters<TSelectors>, ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>, T>): ModelBuilder<TDependencies, TProps, TState, TSelectors & T, TReducers, TEffects>;
    reducers<T extends Reducers<TDependencies, TProps, TState>>(reducers: T): ModelBuilder<TDependencies, TProps, TState, TSelectors, TReducers & T, TEffects>;
    effects<T extends Effects<TDependencies, TProps, TState, ConvertSelectorsToGetters<TSelectors>, ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>>>(effects: T): ModelBuilder<TDependencies, TProps, TState, TSelectors, TReducers, TEffects & T>;
    epics(epics: Epics<TDependencies, TProps, TState, ConvertSelectorsToGetters<TSelectors>, ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>>): ModelBuilder<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>;
    build(props?: TProps): Model<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>;
}
export declare function isModel(obj: any): obj is Model;
export declare function createModelBuilder(): ModelBuilder<{}, {}, {}, {}, {}, {}>;
export declare function registerModel<TModel extends Model>(storeId: number, namespace: string, model: TModel | TModel[]): void;
export declare function registerModels(storeId: number, namespace: string, models: Models): void;
