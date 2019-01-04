import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { ExtractEffects } from "./effect";
import { ExtractProps, Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  SelectorInternal
} from "./selector";
import { ExtractState } from "./state";

import { createModelActionHelpers } from "./action";
import { getStoreCache } from "./cache";
import { createModelGetters } from "./selector";
import { convertNamespaceToPath } from "./util";

export interface Container<TModel extends Model = any> {
  namespace: string;
  isRegistered: boolean;

  state: ExtractState<TModel>;
  getters: ConvertSelectorsToGetters<ExtractSelectors<TModel>>;
  actions: ConvertReducersAndEffectsToActionHelpers<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  >;

  register(props?: ExtractProps<TModel>): void;
  unregister(): void;
}

export type UseContainer = <TModel extends Model>(
  model: TModel,
  key?: string
) => Container<TModel>;

export class ContainerImpl<TModel extends Model> implements Container<TModel> {
  private static _nextContainerId = 1;

  public readonly namespace: string;

  private readonly _containerId: number;
  private readonly _path: string;

  private _props!: ExtractProps<TModel>;

  private _cachedGetters:
    | ConvertSelectorsToGetters<ExtractSelectors<TModel>>
    | undefined;
  private _cachedActions:
    | ConvertReducersAndEffectsToActionHelpers<
        ExtractReducers<TModel>,
        ExtractEffects<TModel>
      >
    | undefined;

  private get _storeCache() {
    return getStoreCache(this._storeId);
  }

  constructor(
    private readonly _storeId: number,
    private readonly _model: TModel,
    namespace: string,
    private readonly _key: string
  ) {
    this._containerId = ContainerImpl._nextContainerId;
    ContainerImpl._nextContainerId += 1;

    this.namespace = this._key === "" ? namespace : `${namespace}/${this._key}`;
    this._path = convertNamespaceToPath(this.namespace);
  }

  public get isRegistered() {
    return this._storeCache.modelByNamespace[this.namespace] === this._model;
  }

  public get state() {
    if (this.isRegistered) {
      return this._storeCache.getState()[this._path];
    }

    return undefined;
  }

  public get getters() {
    if (this.isRegistered) {
      if (this._cachedGetters == null) {
        const { dependencies, useContainer } = this._storeCache;

        this._cachedGetters = createModelGetters(
          this._storeId,
          this._containerId,
          this._model,
          this.namespace,
          dependencies,
          this._props,
          this.actions,
          useContainer
        );
      }

      return this._cachedGetters;
    }

    return undefined!;
  }

  public get actions() {
    if (this.isRegistered) {
      if (this._cachedActions == null) {
        this._cachedActions = createModelActionHelpers(
          this._storeId,
          this._model,
          this.namespace
        );
      }

      return this._cachedActions;
    }

    return undefined!;
  }

  public register(props?: ExtractProps<TModel>) {
    const { modelByNamespace, cacheByModel } = this._storeCache;

    // other model may take the same namespace, so just check null
    if (modelByNamespace[this.namespace] != null) {
      throw new Error("container is already registered");
    }

    this._props = props === undefined ? this._model.defaultProps : props;

    modelByNamespace[this.namespace] = this._model;
    cacheByModel.get(this._model)!.containers[this._key] = this;

    // TODO: epics
  }

  public unregister() {
    const { modelByNamespace, cacheByModel } = this._storeCache;

    if (!this.isRegistered) {
      throw new Error("container is not registered yet");
    }

    delete modelByNamespace[this.namespace];
    delete cacheByModel.get(this._model)!.containers[this._key];

    Object.keys(this._model.selectors).forEach((key) => {
      const selector = this._model.selectors[key] as SelectorInternal;
      if (selector.__deleteCache) {
        selector.__deleteCache(this._containerId);
      }
    });

    // TODO: epics
  }
}
