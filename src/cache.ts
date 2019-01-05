import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction } from "./action";
import { Container, UseContainer } from "./container";
import { Model } from "./model";
import { ReduxAdvancedOptions } from "./store";

import { ContainerImpl } from "./container";
import { buildNamespace } from "./util";

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

  effectDispatchHandlerByAction: Map<
    AnyAction,
    {
      hasEffect: boolean;
      resolve: () => void;
      reject: (err: unknown) => void;
    }
  >;

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

const cacheByStoreId: {
  [storeId: number]: StoreCache;
} = {};

export function getStoreCache(storeId: number) {
  if (cacheByStoreId[storeId] == null) {
    cacheByStoreId[storeId] = {
      store: undefined!,
      options: undefined!,
      dependencies: undefined!,
      addEpic$: undefined!,
      initialEpics: [],

      getState: (...args) => cacheByStoreId[storeId].store!.getState(...args),
      dispatch: (...args) => cacheByStoreId[storeId].store!.dispatch(...args),
      useContainer: (model, key) => {
        if (key == null) {
          key = "";
        }

        const { cacheByNamespace, namespaceByModel } = cacheByStoreId[storeId];

        if (!namespaceByModel.has(model)) {
          throw new Error("model is not registered yet");
        }

        const baseNamespace = namespaceByModel.get(model)!;
        const namespace = buildNamespace(baseNamespace, key);

        const namespaceCache = cacheByNamespace[namespace];
        if (namespaceCache == null || namespaceCache.model !== model) {
          return new ContainerImpl(storeId, namespace, model);
        } else {
          return namespaceCache.container;
        }
      },

      pendingNamespaces: [],

      effectDispatchHandlerByAction: new Map(),

      cacheByNamespace: {},
      namespaceByModel: new Map()
    };
  }

  return cacheByStoreId[storeId];
}
