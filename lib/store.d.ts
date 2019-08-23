import { Middleware, Reducer, Store } from "redux";
import { Epic } from "redux-observable";
import { Observable } from "rxjs";
import { AnyAction } from "./action";
import { GetContainer } from "./container";
import { RegisterModels } from "./model";
export interface ReduxAdvancedOptions {
    dependencies: any;
    createStore?: (context: {
        reducer: Reducer;
        epic: Epic;
        middleware: Middleware;
    }) => Store;
    resolveActionName?: (paths: string[]) => string;
    defaultEffectErrorHandler?: (error: any) => void;
    defaultEpicErrorHandler?: (error: any, caught: Observable<AnyAction>) => Observable<AnyAction>;
}
export interface ReduxAdvancedContext {
    store: Store;
    getContainer: GetContainer;
    registerModels: RegisterModels;
    reload: (state?: any) => void;
}
export declare function init(options: ReduxAdvancedOptions): ReduxAdvancedContext;
