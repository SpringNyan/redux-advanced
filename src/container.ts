import {
  batchRegisterActionHelper,
  batchUnregisterActionHelper,
  createActionHelpers,
  ExtractActionHelpersFromReducersEffects
} from "./action";
import { ExtractArgs, generateArgs, requiredArgFunc } from "./args";
import { ModelContext, StoreContext } from "./context";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  createGetters,
  ExtractGettersFromSelectors,
  ExtractSelectors
} from "./selector";
import { ExtractState, getSubState } from "./state";
import { joinLastPart } from "./util";

export interface Container<TModel extends Model = any> {
  namespace: string;
  key: string | undefined;

  getState: () => ExtractState<TModel>;
  getters: ExtractGettersFromSelectors<ExtractSelectors<TModel>>;
  actions: ExtractActionHelpersFromReducersEffects<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  >;

  isRegistered: boolean;
  canRegister: boolean;

  register(args?: ExtractArgs<TModel>): void;
  unregister(): void;
}

export class ContainerImpl<TModel extends Model = Model>
  implements Container<TModel> {
  public readonly namespace: string;

  private readonly _modelContext: ModelContext;

  private _cachedArgs: any;
  private _cachedState: any;
  private _cachedGetters: any;
  private _cachedActions: any;

  private _getStateCache = {
    rootState: {} as any,
    value: undefined as any
  };

  constructor(
    private readonly _storeContext: StoreContext,
    public readonly model: TModel,
    public readonly key: string | undefined
  ) {
    this._modelContext = this._storeContext.contextByModel.get(this.model)!;
    this.namespace = joinLastPart(this._modelContext.baseNamespace, this.key);
  }

  public get isRegistered(): boolean {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.isRegistered;
    }

    const registeredContainer = this._storeContext.containerByNamespace.get(
      this.namespace
    );
    return (
      registeredContainer != null && registeredContainer.model === this.model
    );
  }

  public get canRegister(): boolean {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.canRegister;
    }

    return !this._storeContext.containerByNamespace.has(this.namespace);
  }

  public getRootState(): any {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.getRootState();
    }

    return this._storeContext.adHocRootState !== undefined
      ? this._storeContext.adHocRootState
      : this._storeContext.store.getState();
  }

  public getState(): any {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.getState();
    }

    if (this.isRegistered) {
      const rootState = this.getRootState();
      if (this._getStateCache.rootState === rootState) {
        return this._getStateCache.value;
      }

      const value = getSubState(
        rootState,
        this._modelContext.basePath,
        this.key
      );

      this._getStateCache.rootState = rootState;
      this._getStateCache.value = value;

      return value;
    }

    if (this.canRegister) {
      if (this._cachedState === undefined) {
        const args = generateArgs(
          this.model,
          {
            dependencies: this._storeContext.getDependencies(),
            namespace: this.namespace,
            key: this.key,

            getContainer: this._storeContext.getContainer,

            required: requiredArgFunc
          },
          this._cachedArgs,
          true
        );

        this._cachedState = this.model.state({
          dependencies: this._storeContext.getDependencies(),
          namespace: this.namespace,
          key: this.key,

          args,

          getContainer: this._storeContext.getContainer
        });
      }

      return this._cachedState;
    }

    throw new Error("namespace is already registered by other model");
  }

  public get getters(): ExtractGettersFromSelectors<ExtractSelectors<TModel>> {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.getters;
    }

    if (this.isRegistered || this.canRegister) {
      if (this._cachedGetters === undefined) {
        this._cachedGetters = createGetters(this._storeContext, this);
      }

      return this._cachedGetters;
    }

    throw new Error("namespace is already registered by other model");
  }

  public get actions(): ExtractActionHelpersFromReducersEffects<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  > {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.actions;
    }

    if (this.isRegistered || this.canRegister) {
      if (this._cachedActions === undefined) {
        this._cachedActions = createActionHelpers(this._storeContext, this);
      }

      return this._cachedActions;
    }

    throw new Error("namespace is already registered by other model");
  }

  public register(args?: ExtractArgs<TModel>): void {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.register(args);
    }

    if (!this.canRegister) {
      throw new Error("namespace is already registered");
    }

    this._cachedArgs = args;
    this._cachedState = undefined;

    this._storeContext.store.dispatch(
      batchRegisterActionHelper.create([
        {
          namespace: this.namespace,
          model: this._modelContext.modelIndex,
          args
        }
      ])
    );
  }

  public unregister(): void {
    const container = this._getCurrentContainer();
    if (container !== this) {
      return container.unregister();
    }

    if (this.isRegistered) {
      this._storeContext.store.dispatch(
        batchUnregisterActionHelper.create([
          {
            namespace: this.namespace
          }
        ])
      );
    }
  }

  private _getCurrentContainer() {
    return this._storeContext.getContainer(
      this.model,
      this.key!
    ) as ContainerImpl;
  }
}

export interface GetContainer {
  <TModel extends Model>(model: TModel): Container<TModel>;
  <TModel extends Model>(model: TModel, key: string): Container<TModel>;
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

    let container = modelContext.containerByKey.get(key);
    if (container == null) {
      container = new ContainerImpl(storeContext, model, key);
      modelContext.containerByKey.set(key, container);
    }

    return container;
  };
}
