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
  canRegister: boolean;

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
    public readonly namespace: string,
    private readonly _model: TModel
  ) {
    this._containerId = ContainerImpl._nextContainerId;
    ContainerImpl._nextContainerId += 1;

    this._path = convertNamespaceToPath(this.namespace);
  }

  public get isRegistered() {
    const cache = this._storeCache.cacheByNamespace[this.namespace];
    return cache != null && cache.model === this._model;
  }

  public get canRegister() {
    return this._storeCache.cacheByNamespace[this.namespace] == null;
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
          this.namespace,
          this._model,
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
          this.namespace,
          this._model
        );
      }

      return this._cachedActions;
    }

    return undefined!;
  }

  public register(props?: ExtractProps<TModel>) {
    const { cacheByNamespace, initNamespaces } = this._storeCache;

    if (!this.canRegister) {
      throw new Error("namespace is already used");
    }

    this._props = props === undefined ? this._model.defaultProps : props;

    cacheByNamespace[this.namespace] = {
      path: this._path,

      model: this._model,
      props: this._props,

      container: this
    };

    initNamespaces.push(this.namespace);

    // TODO: epics
  }

  public unregister() {
    const { cacheByNamespace } = this._storeCache;

    if (!this.isRegistered) {
      throw new Error("container is not registered yet");
    }

    delete cacheByNamespace[this.namespace];

    Object.keys(this._model.selectors).forEach((key) => {
      const selector = this._model.selectors[key] as SelectorInternal;
      if (selector.__deleteCache != null) {
        selector.__deleteCache(this._containerId);
      }
    });

    // TODO: epics
  }
}
