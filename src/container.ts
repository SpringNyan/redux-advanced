import { combineEpics } from "redux-observable";

import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { ExtractEffects } from "./effect";
import { ExtractProps, Model } from "./model";
import { ExtractReducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  SelectorInternal
} from "./selector";
import { ExtractState } from "./state";

import { createActionHelpers } from "./action";
import { actionTypes } from "./action";
import { createEffectsReduxObservableEpic } from "./effect";
import { createEpicsReduxObservableEpic } from "./epic";
import { createGetters } from "./selector";
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

  constructor(
    private readonly _storeCache: StoreCache,
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
        this._cachedGetters = createGetters(this._storeCache, this.namespace);
      }

      return this._cachedGetters;
    }

    return undefined!;
  }

  public get actions() {
    if (this.isRegistered) {
      if (this._cachedActions == null) {
        this._cachedActions = createActionHelpers(
          this._storeCache,
          this.namespace
        );
      }

      return this._cachedActions;
    }

    return undefined!;
  }

  public register(props?: ExtractProps<TModel>) {
    const {
      cacheByNamespace,
      pendingNamespaces,
      store,
      dispatch,
      addEpic$,
      initialEpics
    } = this._storeCache;

    if (!this.canRegister) {
      throw new Error("namespace is already used");
    }

    this._props = props === undefined ? this._model.defaultProps : props;

    cacheByNamespace[this.namespace] = {
      path: this._path,

      model: this._model,
      props: this._props,

      containerId: this._containerId,
      container: this
    };

    pendingNamespaces.push(this.namespace);

    const epic = combineEpics(
      createEffectsReduxObservableEpic(this._storeCache, this.namespace),
      createEpicsReduxObservableEpic(this._storeCache, this.namespace)
    );

    if (store != null) {
      addEpic$.next(epic);

      dispatch({
        type: `${this.namespace}/${actionTypes.register}`
      });
    } else {
      initialEpics.push(epic);
    }
  }

  public unregister() {
    const { cacheByNamespace, dispatch } = this._storeCache;

    if (!this.isRegistered) {
      throw new Error("container is not registered yet");
    }

    dispatch({
      type: `${this.namespace}/${actionTypes.epicEnd}`
    });

    delete cacheByNamespace[this.namespace];

    dispatch({
      type: `${this.namespace}/${actionTypes.unregister}`
    });

    Object.keys(this._model.selectors).forEach((key) => {
      const selector = this._model.selectors[key] as SelectorInternal;
      if (selector.__deleteCache != null) {
        selector.__deleteCache(this._containerId);
      }
    });
  }
}
