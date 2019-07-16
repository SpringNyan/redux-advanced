import { Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { Subject } from "rxjs";
import { AnyAction } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { Effect } from "./effect";
import { Model } from "./model";
import { Reducer } from "./reducer";
import { ReduxAdvancedOptions } from "./store";
export interface StoreContext {
    store: Store;
    options: ReduxAdvancedOptions;
    getContainer: GetContainer;
    addEpic$: Subject<ReduxObservableEpic>;
    contextByModel: Map<Model, {
        baseNamespace: string;
        isDynamic: boolean;
        reducerByActionName: Map<string, Reducer>;
        effectByActionName: Map<string, Effect>;
        idByKey: Map<string | undefined, number>;
    }>;
    modelsByBaseNamespace: Map<string, Model[]>;
    containerByNamespace: Map<string, ContainerImpl>;
    containerById: Map<number, ContainerImpl>;
    cacheById: Map<number, {
        cachedState: any;
        cachedGetters: any;
        cachedActions: any;
        cachedDispatch: any;
    }>;
    contextByAction: WeakMap<AnyAction, {
        container: ContainerImpl;
        deferred: {
            resolve: (value: any) => void;
            reject: (err: any) => void;
        };
    }>;
    findModelsInfo: (namespace: string) => {
        baseNamespace: string;
        key: string | undefined;
        models: Model[];
    } | null;
}
export declare function createStoreContext(): StoreContext;
