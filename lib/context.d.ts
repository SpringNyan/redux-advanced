import { Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { Subject } from "rxjs";
import { AnyAction } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { Effect } from "./effect";
import { Model } from "./model";
import { Reducer } from "./reducer";
import { ReduxAdvancedOptions } from "./store";
export interface ModelContext {
    isDynamic: boolean;
    modelIndex: number | undefined;
    baseNamespace: string;
    basePath: string;
    reducerByActionName: Map<string, Reducer>;
    effectByActionName: Map<string, Effect>;
    containerByKey: Map<string | undefined, ContainerImpl>;
}
export interface StoreContext {
    store: Store;
    options: ReduxAdvancedOptions;
    getContainer: GetContainer;
    addEpic$: Subject<ReduxObservableEpic>;
    switchEpic$: Subject<void>;
    adHocRootState: any;
    contextByModel: Map<Model, ModelContext>;
    modelsByBaseNamespace: Map<string, Model[]>;
    containerByNamespace: Map<string, ContainerImpl>;
    deferredByAction: WeakMap<AnyAction, {
        resolve: (value: any) => void;
        reject: (err: any) => void;
    }>;
    getDependencies: () => any;
    resolveActionName: (paths: string[]) => string;
    parseNamespace: (namespace: string) => {
        baseNamespace: string;
        key: string | undefined;
        models: Model[];
    } | null;
}
export declare function createStoreContext(): StoreContext;
