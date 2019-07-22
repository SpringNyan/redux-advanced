import { Model } from "./model";
export declare const stateModelsKey = "__models";
export interface StateContext<TDependencies extends object | undefined = any, TArgs extends object | undefined = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    args: StateArgs<TArgs>;
}
export declare type StateFactory<TDependencies extends object | undefined, TArgs extends object | undefined, TState extends object | undefined> = (context: StateContext<TDependencies, TArgs>) => TState;
export declare type ExtractState<T extends Model> = T extends Model<any, any, infer TState, any, any, any, any> ? TState : never;
export declare type StateArgs<TArgs extends object | undefined> = TArgs extends object ? Required<TArgs> : TArgs;
export declare function getSubState(rootState: any, basePath: string, key: string | undefined): any;
export declare function setSubState(rootState: any, value: any, basePath: string, key: string | undefined): any;
