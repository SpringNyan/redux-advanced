import { Dispatch, Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { BehaviorSubject } from "rxjs";

import { AnyAction, ConvertReducersAndEffectsToActionHelpers } from "./action";
import {
  Container,
  ContainerImpl,
  createGetContainer,
  GetContainer
} from "./container";
import { Effect, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer } from "./reducer";
import { ConvertSelectorsToGetters, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";
import { ReduxAdvancedOptions } from "./store";
import { nil } from "./util";

export interface StoreCache {
  initialized: boolean;

  store: Store;
  options: ReduxAdvancedOptions;
  dependencies: any;
  getContainer: GetContainer;
  addEpic$: BehaviorSubject<ReduxObservableEpic>;

  getState: () => any;
  dispatch: Dispatch;

  pendingInitContainers: Array<{ container: Container; initialState: any }>;
  pendingInitStates: Array<{ namespace: string; state: any }>;
  pendingInitEpics: ReduxObservableEpic[];

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
}

export function createStoreCache(): StoreCache {
  const storeCache: StoreCache = {
    initialized: false,

    store: undefined!,
    options: undefined!,
    dependencies: undefined!,
    getContainer: undefined!,
    addEpic$: undefined!,

    getState: (...args) => storeCache.store!.getState(...args),
    dispatch: (...args) => storeCache.store!.dispatch(...args),

    pendingInitContainers: [],
    pendingInitStates: [],
    pendingInitEpics: [],

    nextCacheId: 1,
    cacheById: new Map(),

    containerById: new Map(),
    containerByNamespace: new Map(),

    contextByModel: new Map(),

    contextByAction: new WeakMap()
  };

  storeCache.getContainer = createGetContainer(storeCache);

  return storeCache;
}
