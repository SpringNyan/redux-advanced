import {
  createActionHelpers,
  createRegisterActionHelper,
  createUnregisterActionHelper,
  ExtractActionHelpersFromReducersEffects
} from "./action";
import { argsRequired, ExtractArgs, generateArgs } from "./args";
import { StoreContext } from "./context";
import { createEffectDispatch, EffectDispatch, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  createGetters,
  ExtractGettersFromSelectors,
  ExtractSelectors
} from "./selector";
import { ExtractState, getSubState } from "./state";
import { convertNamespaceToPath, joinLastPart, nil } from "./util";

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

  register(args?: ExtractArgs<TModel>): void;
  unregister(): void;
}

export type GetContainer = (<TModel extends Model>(
  model: TModel
) => Container<TModel>) &
  (<TModel extends Model>(model: TModel, key: string) => Container<TModel>);

export class ContainerImpl<TModel extends Model = Model>
  implements Container<TModel> {
  public static nextId: number = 1;

  public readonly id: number;

  public readonly namespace: string;

  public readonly baseNamespace: string;
  public readonly basePath: string;

  constructor(
    private readonly _storeContext: StoreContext,
    public readonly model: TModel,
    public readonly key: string | undefined
  ) {
    const modelContext = this._storeContext.contextByModel.get(this.model)!;
    this.baseNamespace = modelContext.baseNamespace;

    this.id = modelContext.idByKey.get(this.key)!;

    this.namespace = joinLastPart(this.baseNamespace, this.key);
    this.basePath = convertNamespaceToPath(this.baseNamespace);
  }

  public get cache() {
    let cache = this._storeContext.cacheById.get(this.id);
    if (cache == null) {
      cache = {
        cachedArgs: undefined,
        cachedState: nil,
        cachedGetters: undefined,
        cachedActions: undefined,
        cachedDispatch: undefined,

        selectorCacheByPath: new Map()
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
        const args = generateArgs(
          this.model,
          {
            dependencies: this._storeContext.options.dependencies,
            namespace: this.namespace,
            key: this.key,

            required: argsRequired
          },
          cache.cachedArgs,
          true
        );

        cache.cachedState = this.model.state({
          dependencies: this._storeContext.options.dependencies,
          namespace: this.namespace,
          key: this.key,

          args
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

  public get dispatch(): EffectDispatch {
    if (this.isRegistered || this.canRegister) {
      const cache = this.cache;

      if (cache.cachedDispatch === undefined) {
        cache.cachedDispatch = createEffectDispatch(this._storeContext, this);
      }

      return cache.cachedDispatch;
    }

    throw new Error("namespace is already registered by other container");
  }

  public register(args?: ExtractArgs<TModel>) {
    if (!this.canRegister) {
      throw new Error("namespace is already registered");
    }

    const cache = this.cache;
    cache.cachedArgs = args;
    cache.cachedState = nil;

    const models = this._storeContext.modelsByBaseNamespace.get(
      this.baseNamespace
    )!;
    const modelIndex = models.indexOf(this.model);

    this._storeContext.store.dispatch(
      createRegisterActionHelper(this.namespace).create({
        model: modelIndex,
        args
      })
    );
  }

  public unregister() {
    if (this.isRegistered) {
      this._storeContext.store.dispatch(
        createUnregisterActionHelper(this.namespace).create({})
      );
    } else {
      this.clearCache();
    }
  }

  public clearCache() {
    this._storeContext.containerById.delete(this.id);
    this._storeContext.cacheById.delete(this.id);
  }
}

export function createGetContainer(storeContext: StoreContext): GetContainer {
  return (model: Model, key?: string) => {
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
