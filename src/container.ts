import {
  ActionHelperDispatch,
  actionTypes,
  createActionHelperDispatch,
  createActionHelpers,
  ExtractActionHelpersFromReducersEffects
} from "./action";
import { StoreContext } from "./context";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  createGetters,
  ExtractGettersFromSelectors,
  ExtractSelectors,
  SelectorInternal
} from "./selector";
import { ExtractState, getSubState } from "./state";
import {
  convertNamespaceToPath,
  joinLastPart,
  mapObjectDeeply,
  nil
} from "./util";

export interface Container<TModel extends Model = any> {
  namespace: string;
  key: string | undefined;

  isRegistered: boolean;
  canRegister: boolean;

  state: ExtractState<TModel>;
  getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
  actions: ExtractActionHelpersFromReducersEffects<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  >;

  register(): void;
  unregister(): void;
}

export type GetContainer = <TModel extends Model>(
  model: TModel,
  key?: string
) => Container<TModel>;

export class ContainerImpl<TModel extends Model = Model>
  implements Container<TModel> {
  public static nextId: number = 1;

  public readonly id: number;

  public readonly namespace: string;
  public readonly basePath: string;

  constructor(
    private readonly _storeContext: StoreContext,
    public readonly model: TModel,
    public readonly key: string | undefined
  ) {
    const modelContext = this._storeContext.contextByModel.get(this.model)!;
    const baseNamespace = modelContext.baseNamespace;

    this.id = modelContext.idByKey.get(this.key)!;

    this.namespace = joinLastPart(baseNamespace, this.key);
    this.basePath = convertNamespaceToPath(baseNamespace);
  }

  public get cache() {
    let cache = this._storeContext.cacheById.get(this.id);
    if (cache == null) {
      cache = {
        cachedState: nil,
        cachedGetters: undefined,
        cachedActions: undefined,
        cachedDispatch: undefined
      };
      this._storeContext.cacheById.set(this.id, cache);
    }

    return cache;
  }

  public get isRegistered() {
    const container = this._storeContext.containerByNamespace.get(
      this.namespace
    );
    return container != null && container.model === this.model;
  }

  public get canRegister() {
    return !this._storeContext.containerByNamespace.has(this.namespace);
  }

  public get state() {
    if (this.isRegistered) {
      return getSubState(
        this._storeContext.store.getState(),
        this.basePath,
        this.key
      );
    }

    if (this.canRegister) {
      const cache = this.cache;
      if (cache.cachedState === nil) {
        cache.cachedState = this.model.state({
          dependencies: this._storeContext.options.dependencies,
          namespace: this.namespace,
          key: this.key
        });
      }

      return cache.cachedState;
    }

    throw new Error("namespace is already registered by other container");
  }

  public get getters(): ExtractGettersFromSelectors<ExtractSelectors<TModel>> {
    if (this.isRegistered || this.canRegister) {
      const cache = this.cache;

      if (cache.cachedGetters === undefined) {
        cache.cachedGetters = createGetters(this._storeContext, this);
      }

      return cache.cachedGetters;
    }

    throw new Error("namespace is already registered by other container");
  }

  public get actions(): ExtractActionHelpersFromReducersEffects<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  > {
    if (this.isRegistered || this.canRegister) {
      const cache = this.cache;

      if (cache.cachedActions === undefined) {
        cache.cachedActions = createActionHelpers(this._storeContext, this);
      }

      return cache.cachedActions;
    }

    throw new Error("namespace is already registered by other container");
  }

  public get dispatch(): ActionHelperDispatch {
    if (this.isRegistered || this.canRegister) {
      const cache = this.cache;

      if (cache.cachedDispatch === undefined) {
        cache.cachedDispatch = createActionHelperDispatch(
          this._storeContext,
          this
        );
      }

      return cache.cachedDispatch;
    }

    throw new Error("namespace is already registered by other container");
  }

  public register() {
    if (!this.canRegister) {
      throw new Error("namespace is already registered");
    }

    this._storeContext.store.dispatch({
      type: joinLastPart(this.namespace, actionTypes.register)
    });
  }

  public unregister() {
    if (this.isRegistered) {
      this._storeContext.store.dispatch({
        type: joinLastPart(this.namespace, actionTypes.unregister)
      });
    } else {
      this.clearCache();
    }
  }

  public clearCache() {
    mapObjectDeeply({}, this.model.selectors, (selector: SelectorInternal) => {
      if (selector.__deleteCache) {
        selector.__deleteCache(this.id);
      }
    });

    this._storeContext.containerById.delete(this.id);
    this._storeContext.cacheById.delete(this.id);
  }
}

export function createGetContainer(storeContext: StoreContext): GetContainer {
  return (model, key) => {
    const modelContext = storeContext.contextByModel.get(model);
    if (modelContext == null) {
      throw new Error("model is not registered yet");
    }

    if (key === undefined && modelContext.isDynamic) {
      throw new Error("key should be provided for dynamic model");
    }

    if (key !== undefined && !modelContext.isDynamic) {
      throw new Error("key should not be provided for static model");
    }

    let id = modelContext.idByKey.get(key);
    if (id == null) {
      id = ContainerImpl.nextId;
      ContainerImpl.nextId += 1;
      modelContext.idByKey.set(key, id);
    }

    let container = storeContext.containerById.get(id);
    if (container == null) {
      container = new ContainerImpl(storeContext, model, key);
      storeContext.containerById.set(id, container);
    }

    return container;
  };
}
