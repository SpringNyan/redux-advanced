import { ExtractActionHelpersFromReducersEffects, RegisterPayload } from "./action";
import { ArgsFactory, ExtractArgs, ToArgs } from "./args";
import { StoreContext } from "./context";
import { ExtractDependencies } from "./dependencies";
import { Effects, ExtractEffects, OverrideEffects } from "./effect";
import { Epic, Epics, ExtractEpics, OverrideEpics } from "./epic";
import { ExtractReducers, OverrideReducers, Reducers } from "./reducer";
import { ExtractGettersFromSelectors, ExtractSelectors, OverrideSelectors, Selectors, SelectorsFactory } from "./selector";
import { ExtractState, StateFactory } from "./state";
import { DeepPartial } from "./util";
export interface ModelOptions {
    autoRegister?: boolean;
}
export interface Model<TDependencies = any, TArgs extends object = any, TState extends object = any, TSelectors extends Selectors = any, TReducers extends Reducers = any, TEffects extends Effects = any, TEpics extends Epics = any> {
    options: ModelOptions;
    args: ArgsFactory<TDependencies, TArgs>;
    state: StateFactory<TDependencies, TArgs, TState>;
    selectors: TSelectors;
    reducers: TReducers;
    effects: TEffects;
    epics: TEpics;
}
export interface Models<TDependencies = any> {
    [key: string]: Model<TDependencies> | Array<Model<TDependencies>> | Models<TDependencies>;
}
export declare type ExtractModel<T extends ModelBuilder> = ReturnType<T["build"]>;
export declare class ModelBuilder<TDependencies = any, TArgs extends object = any, TState extends object = any, TSelectors extends Selectors = any, TReducers extends Reducers = any, TEffects extends Effects = any, TEpics extends Epics = any> {
    private static _nextEpicId;
    private readonly _model;
    private _isFrozen;
    constructor(model: Model<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>);
    freeze(): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    clone(): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    extend<TModel extends Model>(model: TModel): ModelBuilder<TDependencies & ExtractDependencies<TModel>, TArgs & ExtractArgs<TModel>, TState & ExtractState<TModel>, TSelectors & ExtractSelectors<TModel>, TReducers & ExtractReducers<TModel>, TEffects & ExtractEffects<TModel>, TEpics & ExtractEpics<TModel>>;
    extend<TModel extends Model, TNamespace extends string>(model: TModel, namespace: TNamespace): ModelBuilder<TDependencies & ExtractDependencies<TModel>, TArgs & {
        [P in TNamespace]: ExtractArgs<TModel>;
    }, TState & {
        [P in TNamespace]: ExtractState<TModel>;
    }, TSelectors & {
        [P in TNamespace]: ExtractSelectors<TModel>;
    }, TReducers & {
        [P in TNamespace]: ExtractReducers<TModel>;
    }, TEffects & {
        [P in TNamespace]: ExtractEffects<TModel>;
    }, TEpics & {
        [P in TNamespace]: ExtractEpics<TModel>;
    }>;
    dependencies<T>(): ModelBuilder<TDependencies & T, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    args<T extends object>(args: T | ArgsFactory<TDependencies, T>): ModelBuilder<TDependencies, TArgs & ToArgs<T>, TState, TSelectors, TReducers, TEffects, TEpics>;
    overrideArgs(override: (base: TArgs) => DeepPartial<TArgs> | ArgsFactory<TDependencies, DeepPartial<TArgs>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    state<T extends object>(state: T | StateFactory<TDependencies, TArgs, T>): ModelBuilder<TDependencies, TArgs, TState & T, TSelectors, TReducers, TEffects, TEpics>;
    overrideState(override: (base: TState) => DeepPartial<TState> | StateFactory<TDependencies, TArgs, DeepPartial<TState>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    selectors<T extends Selectors<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>(selectors: T | SelectorsFactory<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>, T>): ModelBuilder<TDependencies, TArgs, TState, TSelectors & T, TReducers, TEffects, TEpics>;
    overrideSelectors(override: (base: TSelectors) => DeepPartial<OverrideSelectors<TSelectors, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>> | SelectorsFactory<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>, DeepPartial<OverrideSelectors<TSelectors, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>>): ModelBuilder<TDependencies, TArgs, TState, OverrideSelectors<TSelectors, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>, TReducers, TEffects, TEpics>;
    reducers<T extends Reducers<TDependencies, TState>>(reducers: T): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers & T, TEffects, TEpics>;
    overrideReducers(override: (base: TReducers) => DeepPartial<OverrideReducers<TReducers, TDependencies, TState>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, OverrideReducers<TReducers, TDependencies, TState>, TEffects, TEpics>;
    effects<T extends Effects<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>(effects: T): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects & T, TEpics>;
    overrideEffects(override: (base: TEffects) => DeepPartial<OverrideEffects<TEffects, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, OverrideEffects<TEffects, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>, TEpics>;
    epics<T extends Epics<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>(epics: T | Array<Epic<TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics & T>;
    overrideEpics(override: (base: TEpics) => DeepPartial<OverrideEpics<TEpics, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, OverrideEpics<TEpics, TDependencies, TState, ExtractGettersFromSelectors<TSelectors>, ExtractActionHelpersFromReducersEffects<TReducers, TEffects>>>;
    options(options: ModelOptions): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    overrideOptions(override: (base: ModelOptions) => DeepPartial<ModelOptions>): ModelBuilder<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
    build(): Model<TDependencies, TArgs, TState, TSelectors, TReducers, TEffects, TEpics>;
}
export declare function isModel(obj: any): obj is Model;
export declare function createModelBuilder(): ModelBuilder<{}, {}, {}, {}, {}, {}, {}>;
export declare function registerModel<TModel extends Model>(storeContext: StoreContext, namespace: string, model: TModel | TModel[]): void;
export declare function registerModels(storeContext: StoreContext, namespace: string, models: Models): RegisterPayload[];
export declare type RegisterModels = (models: Models) => void;
export declare function createRegisterModels(storeContext: StoreContext): RegisterModels;
