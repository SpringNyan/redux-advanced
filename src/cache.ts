import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction, ConvertReducersAndEffectsToActionHelpers } from "./action";
import { UseContainer } from "./container";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractProps } from "./props";
import { ExtractReducers } from "./reducer";
import { ConvertSelectorsToGetters, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
import { ReduxAdvancedOptions } from "./store";

import { ContainerImpl, createUseContainer } from "./container";
import { nil } from "./util";

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
      resolve: (value: any) => void;
      reject: (err: unknown) => void;
    }
  >;
  autoRegisterContextByAction: WeakMap<
    AnyAction,
    {
      model: Model;
      key: string;
    }
  >;

  nextCacheId: number;
  cacheById: Map<
    string,
    {
      props: ExtractProps<Model> | undefined;

      cachedState: ExtractState<Model> | typeof nil;
      cachedGetters:
        | ConvertSelectorsToGetters<ExtractSelectors<Model>>
        | undefined;
      cachedActions:
        | ConvertReducersAndEffectsToActionHelpers<
            ExtractReducers<Model>,
            ExtractEffects<Model>
          >
        | undefined;
    }
  >;

  containerById: Map<string, ContainerImpl<Model>>;
  containerByNamespace: Map<string, ContainerImpl<Model>>;

  contextByModel: Map<
    Model,
    {
      baseNamespace: string;
      cacheIdByKey: Map<string, string>;
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
    useContainer: undefined!,

    initStateNamespaces: [],

    effectDispatchHandlerByAction: new Map(),
    autoRegisterContextByAction: new WeakMap(),

    nextCacheId: 1,
    cacheById: new Map(),

    containerById: new Map(),
    containerByNamespace: new Map(),

    contextByModel: new Map()
  };

  storeCache.useContainer = createUseContainer(storeCache);

  return storeCache;
}
