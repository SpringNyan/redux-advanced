import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction } from "./action";
import { UseContainer } from "./container";
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

  initStateNamespaces: string[];

  effectDispatchHandlerByAction: Map<
    AnyAction,
    {
      hasEffect: boolean;
      resolve: () => void;
      reject: (err: unknown) => void;
    }
  >;

  containerByNamespace: {
    [namespace: string]: ContainerImpl<Model>;
  };
  namespaceByModel: Map<Model, string>;
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
      if (!storeCache.namespaceByModel.has(model)) {
        throw new Error("model is not registered yet");
      }

      const baseNamespace = storeCache.namespaceByModel.get(model)!;
      const namespace = buildNamespace(baseNamespace, key);

      const container = storeCache.containerByNamespace[namespace];
      if (container == null || container.model !== model) {
        return new ContainerImpl(storeCache, model, baseNamespace, key);
      } else {
        return container;
      }
    },

    initStateNamespaces: [],

    effectDispatchHandlerByAction: new Map(),

    containerByNamespace: {},
    namespaceByModel: new Map()
  };

  return storeCache;
}
