import { Reducer, Store } from "redux";
import { Epic } from "redux-observable";
import { Observable } from "rxjs";
import { AnyAction } from "./action";
import { UseContainer } from "./container";
import { Models } from "./model";
export interface AdvancedStore extends Store {
    useContainer: UseContainer;
}
export interface ReduxAdvancedOptions {
    createStore?: (rootReducer: Reducer, rootEpic: Epic) => Store;
    epicErrorHandler?: (err: any, caught: Observable<AnyAction>) => Observable<AnyAction>;
}
export declare function createAdvancedStore<TDependencies, TModels extends Models<TDependencies>>(dependencies: TDependencies, models: TModels, options?: ReduxAdvancedOptions): AdvancedStore;
