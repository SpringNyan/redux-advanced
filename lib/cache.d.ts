import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";
import { AnyAction } from "./action";
import { Container, UseContainer } from "./container";
import { Model } from "./model";
import { ReduxAdvancedOptions } from "./store";
export interface StoreCache {
    store: Store;
    options: ReduxAdvancedOptions;
    dependencies: any;
    addEpic$: BehaviorSubject<ReduxObservableEpic>;
    initialEpics: ReduxObservableEpic[];
    getState: () => any;
    dispatch: Dispatch;
    useContainer: UseContainer;
    pendingNamespaces: string[];
    effectDispatchHandlerByAction: Map<AnyAction, {
        hasEffect: boolean;
        resolve: () => void;
        reject: (err: unknown) => void;
    }>;
    cacheByNamespace: {
        [namespace: string]: {
            path: string;
            model: Model;
            props: any;
            containerId: number;
            container: Container;
        };
    };
    namespaceByModel: Map<Model, string>;
}
export declare function getStoreCache(storeId: number): StoreCache;
