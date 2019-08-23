import { GetContainer } from "./container";
import { Model } from "./model";
export declare const stateModelsKey = "@@models";
export interface StateContext<TDependencies = any, TArgs extends object = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    args: StateArgs<TArgs>;
    getContainer: GetContainer;
}
export declare type StateFactory<TDependencies, TArgs extends object, TState extends object> = (context: StateContext<TDependencies, TArgs>) => TState;
export declare type ExtractState<T extends Model> = T extends Model<any, any, infer TState, any, any, any, any> ? TState : never;
export declare type StateArgs<TArgs> = TArgs extends object ? Required<TArgs> : TArgs;
export declare function getSubState(rootState: any, basePath: string, key: string | undefined): any;
export declare function setSubState(rootState: any, value: any, basePath: string, key: string | undefined): any;
