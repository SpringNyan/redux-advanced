import { Reducer as ReduxReducer } from "redux";
import { Model } from "./model";
export interface ReducerContext<TDependencies = any, TProps = any, TState = any> {
    dependencies: TDependencies;
    props: TProps;
    originalState: TState;
}
export declare type Reducer<TDependencies = any, TProps = any, TState = any, TPayload = any> = (state: TState, payload: TPayload, context: ReducerContext<TDependencies, TProps, TState>) => void;
export interface Reducers<TDependencies = any, TProps = any, TState = any> {
    [name: string]: Reducer<TDependencies, TProps, TState>;
}
export declare type ExtractReducers<T extends Model> = T extends Model<any, any, any, any, infer TReducers, any> ? TReducers : never;
export declare function createReduxRootReducer(storeId: number): ReduxReducer;
