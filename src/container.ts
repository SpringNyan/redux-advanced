import {
  createActionHelpers,
  ExtractActionHelpers,
  registerActionHelper,
  unregisterActionHelper,
} from "./action";
import {
  ContainerArgs,
  createRequiredArg,
  ExtractArgs,
  generateArgs,
} from "./args";
import { ModelContext, StoreContext } from "./context";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import { createGetters, ExtractGetters, ExtractSelectors } from "./selector";
import { ExtractState, getSubState } from "./state";
import { joinLastPart, nothingToken } from "./util";

export interface ContainerInternal<TArgs, TState, TGetters, TActionHelpers> {
  namespace: string;
  key: string | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  isRegistered: boolean;
  canRegister: boolean;

  register(args?: TArgs): void;
  unregister(): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Container<TModel extends Model = any>
  extends ContainerInternal<
    ContainerArgs<ExtractArgs<TModel>>,
    ExtractState<TModel>,
    ExtractGetters<ExtractSelectors<TModel>>,
    ExtractActionHelpers<ExtractReducers<TModel>, ExtractEffects<TModel>>
  > {}

export class ContainerImpl<TModel extends Model = Model>
  implements Container<TModel> {
  public readonly namespace: string;

  private readonly _modelContext: ModelContext;

  private _cachedState: any;
  private _cachedGetters: any;
  private _cachedActions: any;

  private _getStateCache = {
    rootState: {} as any,
    value: undefined as any,
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
    const container = this._storeContext.containerByNamespace.get(
      this.namespace
    );
    return container?.model === this.model;
  }

  public get canRegister(): boolean {
    return !this._storeContext.containerByNamespace.has(this.namespace);
  }

  public getRootState(): any {
    return this._storeContext.reducerRootState !== nothingToken
      ? this._storeContext.reducerRootState
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

            required: createRequiredArg,
          },
          undefined,
          true
        );

        this._cachedState = this.model.state({
          dependencies: this._storeContext.getDependencies(),
          namespace: this.namespace,
          key: this.key,

          args,

          getContainer: this._storeContext.getContainer,
        });
      }

      return this._cachedState;
    }

    throw new Error(
      `Failed to initialize container: namespace "${this.namespace}" is already registered by other container`
    );
  }

  public get getters(): ExtractGetters<ExtractSelectors<TModel>> {
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

    throw new Error(
      `Failed to initialize container: namespace "${this.namespace}" is already registered by other container`
    );
  }

  public get actions(): ExtractActionHelpers<
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

    throw new Error(
      `Failed to initialize container: namespace "${this.namespace}" is already registered by other container`
    );
  }

  public register(args?: ContainerArgs<ExtractArgs<TModel>>): void {
    if (!this.canRegister) {
      throw new Error(
        `Failed to register container: namespace "${this.namespace}" is already registered`
      );
    }

    this._storeContext.store.dispatch(
      registerActionHelper.create([
        {
          namespace: this.namespace,
          model: this._modelContext.modelIndex,
          args,
        },
      ])
    );
  }

  public unregister(): void {
    if (this.isRegistered) {
      this._storeContext.store.dispatch(
        unregisterActionHelper.create([
          {
            namespace: this.namespace,
          },
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
  <TModel extends Model>(namespace: string): Container<TModel>;
  <TModel extends Model>(namespace: string, key: string): Container<TModel>;
}

export function createGetContainer(storeContext: StoreContext): GetContainer {
  return (model: Model | string, key?: string) => {
    if (typeof model === "string") {
      const parsed = storeContext.parseNamespace(model);
      if (parsed == null) {
        throw new Error(
          `Failed to get container: namespace "${model}" is not registered by model`
        );
      }

      let index = 0;
      if (parsed.key != null) {
        index = parseInt(parsed.key, 10);
      }
      model = parsed.models[index];
    }

    const modelContext = storeContext.contextByModel.get(model);
    if (modelContext == null) {
      throw new Error(`Failed to get container: model is not registered`);
    }

    if (key === undefined && modelContext.isDynamic) {
      throw new Error(
        `Failed to get container: key is required for dynamic model`
      );
    }

    if (key !== undefined && !modelContext.isDynamic) {
      throw new Error(
        `Failed to get container: key is unavailable for static model`
      );
    }

    let container = modelContext.containerByKey.get(key);
    if (container == null) {
      container = new ContainerImpl(storeContext, model, key);
      modelContext.containerByKey.set(key, container);
    }

    return container;
  };
}

export function createSubContainer<
  TModel extends Model,
  TSubKey extends string
>(
  container: Container<TModel>,
  subKey: TSubKey
): ContainerInternal<
  ContainerArgs<ExtractArgs<TModel>>[TSubKey],
  ExtractState<TModel>[TSubKey],
  ExtractGetters<ExtractSelectors<TModel>>[TSubKey],
  ExtractActionHelpers<ExtractReducers<TModel>, ExtractEffects<TModel>>[TSubKey]
> {
  return {
    get namespace(): string {
      throw new Error(`Sub container doesn't support namespace`);
    },
    get key(): string | undefined {
      throw new Error(`Sub container doesn't support key`);
    },

    getState: () => container.getState()[subKey],
    get getters() {
      return container.getters[subKey] as any;
    },
    get actions() {
      return container.actions[subKey] as any;
    },

    get isRegistered(): boolean {
      return container.isRegistered;
    },
    get canRegister(): boolean {
      throw new Error(`Sub container doesn't support canRegister`);
    },

    register: () => {
      throw new Error(`Sub container doesn't support register`);
    },
    unregister: () => {
      throw new Error(`Sub container doesn't support unregister`);
    },
  };
}
