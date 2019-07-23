import { Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { Subject } from "rxjs";

import { AnyAction } from "./action";
import { ContainerImpl, createGetContainer, GetContainer } from "./container";
import { Effect } from "./effect";
import { Model } from "./model";
import { Reducer } from "./reducer";
import { SelectorCache } from "./selector";
import { ReduxAdvancedOptions } from "./store";
import { splitLastPart } from "./util";

export interface StoreContext {
  store: Store;
  options: ReduxAdvancedOptions;

  getContainer: GetContainer;

  addEpic$: Subject<ReduxObservableEpic>;

  reducerRootState: any;

  contextByModel: Map<
    Model,
    {
      baseNamespace: string;
      isDynamic: boolean;

      reducerByActionName: Map<string, Reducer>;
      effectByActionName: Map<string, Effect>;

      idByKey: Map<string | undefined, number>;
    }
  >;

  modelsByBaseNamespace: Map<string, Model[]>;
  containerByNamespace: Map<string, ContainerImpl>;

  containerById: Map<number, ContainerImpl>;
  cacheById: Map<
    number,
    {
      cachedArgs: any;
      cachedState: any;
      cachedGetters: any;
      cachedActions: any;
      cachedDispatch: any;

      selectorCacheByPath: Map<string, SelectorCache>;
    }
  >;

  contextByAction: WeakMap<
    AnyAction,
    {
      container: ContainerImpl;
      deferred: {
        resolve: (value: any) => void;
        reject: (err: any) => void;
      };
    }
  >;

  findModelsInfo: (
    namespace: string
  ) => {
    baseNamespace: string;
    key: string | undefined;
    models: Model[];
  } | null;
}

export function createStoreContext(): StoreContext {
  const storeContext: StoreContext = {
    store: undefined!,
    options: undefined!,

    getContainer: undefined!,

    addEpic$: new Subject(),

    reducerRootState: undefined,

    contextByModel: new Map(),

    modelsByBaseNamespace: new Map(),
    containerByNamespace: new Map(),

    containerById: new Map(),
    cacheById: new Map(),

    contextByAction: new WeakMap(),

    findModelsInfo: (namespace) => {
      let baseNamespace: string = namespace;
      let key: string | undefined;

      let models = storeContext.modelsByBaseNamespace.get(namespace);
      if (models == null) {
        [baseNamespace, key] = splitLastPart(namespace);
        models = storeContext.modelsByBaseNamespace.get(baseNamespace);
      }
      if (models == null) {
        return null;
      }

      return {
        baseNamespace,
        key,
        models
      };
    }
  };

  storeContext.getContainer = createGetContainer(storeContext);

  return storeContext;
}
