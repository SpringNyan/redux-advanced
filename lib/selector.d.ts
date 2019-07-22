import { ActionHelpers } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
import { DeepPartial } from "./util";
export interface SelectorContext<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    state: TState;
    getters: TGetters;
    actions: TActionHelpers;
    getContainer: GetContainer;
}
export declare type Selector<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any, TResult = any> = (context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult;
export interface SelectorCache {
    lastParams?: any[];
    lastResult?: any;
}
export declare type SelectorInternal<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any, TResult = any> = (context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>, cache: SelectorCache) => TResult;
export declare type SelectorParam<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any, TResult = any> = (context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>, oldValue: TResult | undefined) => TResult;
export interface Selectors<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    [name: string]: Selector<TDependencies, TState, TGetters, TActionHelpers> | Selectors<TDependencies, TState, TGetters, TActionHelpers>;
}
export declare type SelectorsFactory<TDependencies extends object | undefined, TState extends object | undefined, TGetters extends Getters, TActionHelpers extends ActionHelpers, TSelectors extends DeepPartial<Selectors<TDependencies, TState, TGetters, TActionHelpers>>> = (createSelector: CreateSelector<TDependencies, TState, TGetters, TActionHelpers>) => TSelectors;
export interface Getters {
    [name: string]: any;
}
export declare type ExtractSelectorResult<T extends Selector> = T extends Selector<any, any, any, any, infer TResult> ? TResult : never;
export declare type ExtractGettersFromSelectors<TSelectors extends Selectors> = {
    [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any ? ExtractSelectorResult<TSelectors[P]> : TSelectors[P] extends {} ? ExtractGettersFromSelectors<TSelectors[P]> : never;
};
export declare type ExtractSelectors<T extends Model> = T extends Model<any, any, any, infer TSelectors, any, any, any> ? TSelectors : never;
export declare type OverrideSelectors<TSelectors, TDependencies extends object | undefined, TState extends object | undefined, TGetters extends Getters, TActionHelpers extends ActionHelpers> = {
    [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any ? Selector<TDependencies, TState, TGetters, TActionHelpers, ExtractSelectorResult<TSelectors[P]>> : OverrideSelectors<TSelectors[P], TDependencies, TState, TGetters, TActionHelpers>;
};
export interface CreateSelector<TDependencies extends object | undefined = any, TState extends object | undefined = any, TGetters extends Getters = any, TActionHelpers extends ActionHelpers = any> {
    <T extends Array<SelectorParam<TDependencies, TState, TGetters, TActionHelpers, any>> | [SelectorParam<TDependencies, TState, TGetters, TActionHelpers, any>], TResult>(selectors: T, combiner: (results: {
        [P in keyof T]: T[P] extends Selector<TDependencies, TState, TGetters, TActionHelpers, any> ? ReturnType<T[P]> : never;
    }, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, combiner: (res1: T1, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, combiner: (res1: T1, res2: T2, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, combiner: (res1: T1, res2: T2, res3: T3, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, T5, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, selector5: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T5>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, res5: T5, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, T5, T6, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, selector5: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T5>, selector6: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T6>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, res5: T5, res6: T6, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, T5, T6, T7, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, selector5: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T5>, selector6: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T6>, selector7: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T7>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, res5: T5, res6: T6, res7: T7, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, T5, T6, T7, T8, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, selector5: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T5>, selector6: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T6>, selector7: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T7>, selector8: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T8>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, res5: T5, res6: T6, res7: T7, res8: T8, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
    <T1, T2, T3, T4, T5, T6, T7, T8, T9, TResult>(selector1: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T1>, selector2: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T2>, selector3: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T3>, selector4: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T4>, selector5: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T5>, selector6: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T6>, selector7: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T7>, selector8: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T8>, selector9: SelectorParam<TDependencies, TState, TGetters, TActionHelpers, T9>, combiner: (res1: T1, res2: T2, res3: T3, res4: T4, res5: T5, res6: T6, res7: T7, res8: T8, res9: T9, context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>) => TResult): Selector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
}
export declare const createSelector: CreateSelector;
export declare function createGetters<TModel extends Model>(storeContext: StoreContext, container: ContainerImpl<TModel>): ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
