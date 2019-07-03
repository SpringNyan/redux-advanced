import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { ExtractDependencies } from "./dependencies";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  SelectorInternal
} from "./selector";
import { ExtractState, StateFactory } from "./state";
import { DeepPartial } from "./util";

import { actionTypes, createActionHelpers } from "./action";
import { createEpicsReduxObservableEpic } from "./epic";
import { createGetters } from "./selector";
import {
  buildNamespace,
  convertNamespaceToPath,
  functionWrapper,
  nil
} from "./util";

export interface Container<TModel extends Model = any> {
  namespace: string;

  isRegistered: boolean;
  canRegister: boolean;

  state: ExtractState<TModel>;
  getters: ConvertSelectorsToGetters<ExtractSelectors<TModel>>;
  actions: ConvertReducersAndEffectsToActionHelpers<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  >;

  register(
    initialState?:
      | DeepPartial<ExtractState<TModel>>
      | StateFactory<
          ExtractDependencies<TModel>,
          DeepPartial<ExtractState<TModel>>
        >
  ): void;
  unregister(): void;
}

export type GetContainer = <TModel extends Model>(
  model: TModel,
  key?: string
) => Container<TModel>;

export class ContainerImpl<TModel extends Model> implements Container<TModel> {
  public readonly id: string;

  public readonly namespace: string;
  public readonly path: string;

  constructor(
    private readonly _storeCache: StoreCache,
    public readonly model: TModel,
    public readonly key: string
  ) {
    const modelContext = this._storeCache.contextByModel.get(this.model)!;
    const baseNamespace = modelContext.baseNamespace;

    this.id = modelContext.cacheIdByKey.get(this.key)!;

    this.namespace = buildNamespace(baseNamespace, this.key);
    this.path = convertNamespaceToPath(this.namespace);
  }

  private get _cache() {
    let cache = this._storeCache.cacheById.get(this.id);
    if (cache == null) {
      cache = {
        cachedState: nil,
        cachedGetters: undefined,
        cachedActions: undefined
      };
      this._storeCache.cacheById.set(this.id, cache);
    }

    return cache;
  }

  public get isRegistered() {
    const container = this._storeCache.containerByNamespace.get(this.namespace);
    return container != null && container.model === this.model;
  }

  public get canRegister() {
    return !this._storeCache.containerByNamespace.has(this.namespace);
  }

  public get state() {
    if (this.isRegistered) {
      return this._storeCache.getState()[this.path];
    }

    if (this.canRegister) {
      const cache = this._cache;
      if (cache.cachedState === nil) {
        cache.cachedState = this.model.state({
          dependencies: this._storeCache.dependencies,
          namespace: this.namespace,
          key: this.key
        });
      }

      return cache.cachedState;
    }

    throw new Error("namespace is already registered by other model");
  }

  public get getters(): ConvertSelectorsToGetters<ExtractSelectors<TModel>> {
    if (this.isRegistered || this.canRegister) {
      const cache = this._cache;

      if (cache.cachedGetters === undefined) {
        cache.cachedGetters = createGetters(this._storeCache, this);
      }

      return cache.cachedGetters;
    }

    throw new Error("namespace is already registered by other model");
  }

  public get actions(): ConvertReducersAndEffectsToActionHelpers<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  > {
    if (this.isRegistered || this.canRegister) {
      const cache = this._cache;

      if (cache.cachedActions === undefined) {
        cache.cachedActions = createActionHelpers(this._storeCache, this);
      }

      return cache.cachedActions;
    }

    throw new Error("namespace is already registered by other model");
  }

  public register(
    initialState?:
      | DeepPartial<ExtractState<TModel>>
      | StateFactory<
          ExtractDependencies<TModel>,
          DeepPartial<ExtractState<TModel>>
        >
  ) {
    if (!this.canRegister) {
      throw new Error("namespace is already registered");
    }

    initialState =
      initialState !== undefined
        ? functionWrapper(initialState)({
            dependencies: this._storeCache.dependencies,
            namespace: this.namespace,
            key: this.key
          })
        : undefined;

    this._storeCache.containerById.set(this.id, this);

    this._storeCache.containerByNamespace.set(this.namespace, this);
    this._storeCache.pendingInitStates.push({
      namespace: this.namespace,
      state: initialState
    });

    const epic = createEpicsReduxObservableEpic(this._storeCache, this);

    if (this._storeCache.initialized) {
      this._storeCache.addEpic$.next(epic);

      this._storeCache.dispatch({
        type: `${this.namespace}/${actionTypes.register}`
      });
    } else {
      this._storeCache.pendingInitEpics.push(epic);
    }
  }

  public unregister() {
    if (this.isRegistered) {
      this._storeCache.containerByNamespace.delete(this.namespace);

      this._storeCache.dispatch({
        type: `${this.namespace}/${actionTypes.unregister}`
      });
    }

    this._clearCache();
  }

  private _clearCache() {
    Object.keys(this.model.selectors).forEach((key) => {
      const selector = this.model.selectors[key] as SelectorInternal;
      if (selector.__deleteCache != null) {
        selector.__deleteCache(this.id);
      }
    });

    this._storeCache.containerById.delete(this.id);
    this._storeCache.cacheById.delete(this.id);
  }
}

export function createGetContainer(storeCache: StoreCache): GetContainer {
  return (model, key) => {
    const modelContext = storeCache.contextByModel.get(model);
    if (modelContext == null) {
      throw new Error("model is not registered yet");
    }

    if (key == null) {
      key = "";
    }

    let cacheId = modelContext.cacheIdByKey.get(key);
    if (cacheId == null) {
      cacheId = "" + storeCache.nextCacheId;
      storeCache.nextCacheId += 1;
      modelContext.cacheIdByKey.set(key, cacheId);
    }

    let container = storeCache.containerById.get(cacheId);
    if (container == null) {
      container = new ContainerImpl(storeCache, model, key);
      storeCache.containerById.set(cacheId, container);
    }

    return container;
  };
}
