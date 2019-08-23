import { Reducer as ReduxReducer } from "redux";
import { ExtractActionPayload } from "./action";
import { StoreContext } from "./context";
import { Model } from "./model";
export interface ReducerContext<TDependencies = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
}
export declare type Reducer<TDependencies = any, TState extends object = any, TPayload = any> = (state: TState, payload: TPayload, context: ReducerContext<TDependencies>) => void;
export interface Reducers<TDependencies = any, TState extends object = any> {
    [name: string]: Reducer<TDependencies, TState> | Reducers<TDependencies, TState>;
}
export declare type ExtractReducers<T extends Model> = T extends Model<any, any, any, any, infer TReducers, any, any> ? TReducers : never;
export declare type OverrideReducers<TReducers, TDependencies, TState extends object> = {
    [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any ? Reducer<TDependencies, TState, ExtractActionPayload<TReducers[P]>> : OverrideReducers<TReducers[P], TDependencies, TState>;
};
export declare function createReduxReducer(storeContext: StoreContext): ReduxReducer;
