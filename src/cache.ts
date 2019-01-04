import { Dispatch, Store } from "redux";

import { Container, UseContainer } from "./container";
import { Model } from "./model";

import { ContainerImpl } from "./container";

const cacheByStoreId: {
  [storeId: number]: {
    store: Store | undefined;
    dependencies: any;
    getState: () => any;
    dispatch: Dispatch;
    useContainer: UseContainer;

    modelByNamespace: {
      [namespace: string]: Model;
    };
    cacheByModel: Map<
      Model,
      {
        namespace: string;
        containers: {
          [key: string]: Container;
        };
      }
    >;
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
        if (key == null) {
          key = "";
        }

        const { cacheByModel } = cacheByStoreId[storeId];

        if (!cacheByModel.has(model)) {
          throw new Error("model is not registered yet");
        }
        const { namespace, containers } = cacheByModel.get(model)!;

        return containers[key] != null
          ? containers[key]
          : new ContainerImpl(storeId, model, namespace, key);
      },

      modelByNamespace: {},
      cacheByModel: new Map()
    };
  }

  return cacheByStoreId[storeId];
}
