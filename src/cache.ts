import { Dispatch, Store } from "redux";
import { StateObservable } from "redux-observable";

import { Container, UseContainer } from "./container";
import { Model } from "./model";

import { ContainerImpl } from "./container";
import { buildNamespace } from "./util";

const cacheByStoreId: {
  [storeId: number]: {
    store: Store | undefined;
    dependencies: any;
    getState: () => any;
    dispatch: Dispatch;
    useContainer: UseContainer;

    initNamespaces: string[];

    cacheByNamespace: {
      [namespace: string]: {
        path: string;

        model: Model;
        props: any;

        container: Container;
      };
    };
    namespaceByModel: Map<Model, string>;
  };
} = {};

export function getStoreCache(storeId: number) {
  if (cacheByStoreId[storeId] == null) {
    cacheByStoreId[storeId] = {
      store: undefined,
      dependencies: undefined,
      getState: (...args) => cacheByStoreId[storeId].store!.getState(...args),
      dispatch: (...args) => cacheByStoreId[storeId].store!.dispatch(...args),
      useContainer: (model, key) => {
        const { cacheByNamespace, namespaceByModel } = cacheByStoreId[storeId];

        if (!namespaceByModel.has(model)) {
          throw new Error("model is not registered yet");
        }

        const baseNamespace = namespaceByModel.get(model)!;
        const namespace = buildNamespace(baseNamespace, key);

        const cache = cacheByNamespace[namespace];
        if (cache == null || cache.model !== model) {
          return new ContainerImpl(storeId, namespace, model);
        } else {
          return cache.container;
        }
      },

      initNamespaces: [],

      cacheByNamespace: {},
      namespaceByModel: new Map()
    };
  }

  return cacheByStoreId[storeId];
}
