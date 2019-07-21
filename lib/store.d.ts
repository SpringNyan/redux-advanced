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
    defaultEffectErrorHandler?: (error: any) => void;
    defaultEpicErrorHandler?: (error: any, caught: Observable<AnyAction>) => Observable<AnyAction>;
    resolveActionName?: (paths: string[]) => string;
}
export interface ReduxAdvancedContext {
    store: Store;
    getContainer: GetContainer;
    registerModels: RegisterModels;
}
export declare function init(options: ReduxAdvancedOptions): ReduxAdvancedContext;
