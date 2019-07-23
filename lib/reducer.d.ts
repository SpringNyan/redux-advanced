import { Reducer as ReduxReducer } from "redux";
import { ExtractActionPayload } from "./action";
import { GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
export interface ReducerContext<TDependencies extends object | undefined = any, TState extends object | undefined = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    originalState: TState;
    getContainer: GetContainer;
}
export declare type Reducer<TDependencies extends object | undefined = any, TState extends object | undefined = any, TPayload = any> = (state: TState, payload: TPayload, context: ReducerContext<TDependencies, TState>) => void;
export interface Reducers<TDependencies extends object | undefined = any, TState extends object | undefined = any> {
    [name: string]: Reducer<TDependencies, TState> | Reducers<TDependencies, TState>;
}
export declare type ExtractReducers<T extends Model> = T extends Model<any, any, any, any, infer TReducers, any, any> ? TReducers : never;
export declare type OverrideReducers<TReducers, TDependencies extends object | undefined, TState extends object | undefined> = {
    [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any ? Reducer<TDependencies, TState, ExtractActionPayload<TReducers[P]>> : OverrideReducers<TReducers[P], TDependencies, TState>;
};
export declare function createReduxReducer(storeContext: StoreContext): ReduxReducer;
