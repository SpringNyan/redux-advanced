import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction, ConvertReducersAndEffectsToActionHelpers } from "./action";
import { GetContainer } from "./container";
import { Effect, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer } from "./reducer";
import { ConvertSelectorsToGetters, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
import { ReduxAdvancedOptions } from "./store";

import { ContainerImpl, createGetContainer } from "./container";
import { nil } from "./util";

export interface StoreCache {
  store: Store;
  options: ReduxAdvancedOptions;
  dependencies: any;

  addEpic$: BehaviorSubject<ReduxObservableEpic>;
  initialEpics: ReduxObservableEpic[];

  getState: () => any;
  dispatch: Dispatch;
  getContainer: GetContainer;

  initStateNamespaces: string[];

  contextByAction: WeakMap<
    AnyAction,
    {
      model: Model;
      key: string;

      effectDeferred?: {
        resolve: (value: any) => void;
        reject: (err: unknown) => void;
      };
    }
  >;

  nextCacheId: number;
  cacheById: Map<
    string,
    {
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

      reducerByActionName: { [name: string]: Reducer };
      effectByActionName: { [name: string]: Effect };
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
    getContainer: undefined!,

    initStateNamespaces: [],

    contextByAction: new WeakMap(),

    nextCacheId: 1,
    cacheById: new Map(),

    containerById: new Map(),
    containerByNamespace: new Map(),

    contextByModel: new Map()
  };

  storeCache.getContainer = createGetContainer(storeCache);

  return storeCache;
}
