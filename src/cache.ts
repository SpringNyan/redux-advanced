import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction } from "./action";
import { UseContainer } from "./container";
import { Model } from "./model";
import { ReduxAdvancedOptions } from "./store";

import { ContainerImpl } from "./container";

export interface StoreCache {
  store: Store;
  options: ReduxAdvancedOptions;
  dependencies: any;

  addEpic$: BehaviorSubject<ReduxObservableEpic>;
  initialEpics: ReduxObservableEpic[];

  getState: () => any;
  dispatch: Dispatch;
  useContainer: UseContainer;

  initStateNamespaces: string[];

  effectDispatchHandlerByAction: Map<
    AnyAction,
    {
      hasEffect: boolean;
      resolve: () => void;
      reject: (err: unknown) => void;
    }
  >;

  containerByNamespace: Map<string, ContainerImpl<Model>>;

  cacheByModel: Map<
    Model,
    {
      baseNamespace: string;
      containerByKey: Map<string, ContainerImpl<Model>>;
    }
  >;
}

export function createStoreCache(): StoreCache {
  const storeCache: StoreCache = {
    store: undefined!,
    options: undefined!,
    dependencies: undefined!,

    addEpic$: undefined!,
    initialEpics: [],

    getState: (...args) => storeCache.store!.getState(...args),
    dispatch: (...args) => storeCache.store!.dispatch(...args),
    useContainer: (model, key) => {
      if (!storeCache.cacheByModel.has(model)) {
        throw new Error("model is not registered yet");
      }

      if (key == null) {
        key = "";
      }

      const { baseNamespace, containerByKey } = storeCache.cacheByModel.get(
        model
      )!;

      if (!containerByKey.has(key)) {
        const container = new ContainerImpl(
          storeCache,
          model,
          baseNamespace,
          key
        );
        containerByKey.set(key, container);
      }

      return containerByKey.get(key)!;
    },

    initStateNamespaces: [],

    effectDispatchHandlerByAction: new Map(),

    containerByNamespace: new Map(),

    cacheByModel: new Map()
  };

  return storeCache;
}
