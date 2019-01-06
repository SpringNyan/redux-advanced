import { Model } from "./model";
export interface StateContext<TDependencies = any, TProps = any> {
    dependencies: TDependencies;
    props: TProps;
}
export declare type StateFactory<TDependencies, TProps, TState> = (context: StateContext<TDependencies, TProps>) => TState;
export declare type ExtractState<T extends Model> = T extends Model<any, any, infer TState, any, any, any> ? TState : never;
