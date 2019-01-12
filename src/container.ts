import {
  ConvertActionHelpersToStrictActionHelpers,
  ConvertReducersAndEffectsToActionHelpers
} from "./action";
import { StoreCache } from "./cache";
import { ExtractDependencies } from "./dependencies";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractProps, PropsFactory } from "./props";
import { ExtractReducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  SelectorInternal
} from "./selector";
import { ExtractState } from "./state";
import { Override } from "./util";

import { createActionHelpers } from "./action";
import { actionTypes } from "./action";
import { createEpicsReduxObservableEpic } from "./epic";
import { createGetters } from "./selector";
import {
  buildNamespace,
  convertNamespaceToPath,
  functionWrapper
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
    props?:
      | ExtractProps<TModel>
      | PropsFactory<ExtractDependencies<TModel>, ExtractProps<TModel>>
  ): void;
  unregister(): void;
}

export type UseContainer = <TModel extends Model>(
  model: TModel,
  key?: string
) => Container<TModel>;

export type StrictContainer<TModel extends Model = any> = Override<
  Container<TModel>,
  {
    actions: ConvertActionHelpersToStrictActionHelpers<
      ConvertReducersAndEffectsToActionHelpers<
        ExtractReducers<TModel>,
        ExtractEffects<TModel>
      >
    >;
  }
>;

export type UseStrictContainer = <TModel extends Model>(
  model: TModel,
  key?: string
) => StrictContainer<TModel>;

export class ContainerImpl<TModel extends Model> implements Container<TModel> {
  private static _nextId = 1;

  public readonly id: string;

  public readonly namespace: string;
  public readonly path: string;

  public props: ExtractProps<TModel>;

  private _cachedState: ExtractState<TModel> | undefined;
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
    public readonly model: TModel,
    public readonly baseNamespace: string,
    public readonly key: string | undefined
  ) {
    this.id = "" + ContainerImpl._nextId;
    ContainerImpl._nextId += 1;

    this.namespace = buildNamespace(this.baseNamespace, this.key);
    this.path = convertNamespaceToPath(this.namespace);

    this.props = this._createProps();
  }

  public get isRegistered() {
    const container = this._storeCache.containerByNamespace[this.namespace];
    return container != null && container.model === this.model;
  }

  public get canRegister() {
    return this._storeCache.containerByNamespace[this.namespace] == null;
  }

  public get state() {
    if (this.canRegister && this.model.autoRegister) {
      if (this._cachedState === undefined) {
        this._cachedState = this.model.state({
          dependencies: this._storeCache.dependencies,
          props: this.props,
          key: this.key
        });
      }

      return this._cachedState;
    }

    if (this.isRegistered) {
      return this._storeCache.getState()[this.path];
    }

    throw new Error("container is not registered yet");
  }

  public get getters(): ConvertSelectorsToGetters<ExtractSelectors<TModel>> {
    if (this._cachedGetters === undefined) {
      this._cachedGetters = createGetters(this._storeCache, this);
    }

    if (this.canRegister && this.model.autoRegister) {
      return this._cachedGetters;
    }

    if (this.isRegistered) {
      return this._cachedGetters;
    }

    throw new Error("container is not registered yet");
  }

  public get actions(): ConvertReducersAndEffectsToActionHelpers<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  > {
    if (this._cachedActions === undefined) {
      this._cachedActions = createActionHelpers(this._storeCache, this);
    }

    if (this.canRegister && this.model.autoRegister) {
      return this._cachedActions;
    }

    if (this.isRegistered) {
      return this._cachedActions;
    }

    throw new Error("container is not registered yet");
  }

  public register(
    props?:
      | ExtractProps<TModel>
      | PropsFactory<ExtractDependencies<TModel>, ExtractProps<TModel>>
  ) {
    if (!this.canRegister) {
      throw new Error("namespace is already used");
    }

    this._clearCache();

    this.props = this._createProps(props);

    this._storeCache.containerByNamespace[this.namespace] = this;
    this._storeCache.initStateNamespaces.push(this.namespace);

    const epic = createEpicsReduxObservableEpic(this._storeCache, this);

    if (this._storeCache.store != null) {
      this._storeCache.addEpic$.next(epic);
      this._storeCache.dispatch({
        type: `${this.namespace}/${actionTypes.register}`
      });
    } else {
      this._storeCache.initialEpics.push(epic);
    }
  }

  public unregister() {
    if (!this.isRegistered) {
      throw new Error("container is not registered yet");
    }

    this._storeCache.dispatch({
      type: `${this.namespace}/${actionTypes.epicEnd}`
    });

    delete this._storeCache.containerByNamespace[this.namespace];

    this._storeCache.dispatch({
      type: `${this.namespace}/${actionTypes.unregister}`
    });

    this._clearCache();
  }

  private _createProps(
    props?:
      | ExtractProps<TModel>
      | PropsFactory<ExtractDependencies<TModel>, ExtractProps<TModel>>
  ) {
    if (props === undefined) {
      props = this.model.defaultProps;
    }

    return functionWrapper(props)({
      dependencies: this._storeCache.dependencies,
      key: this.key
    });
  }

  private _clearCache() {
    this._cachedState = undefined;

    Object.keys(this.model.selectors).forEach((key) => {
      const selector = this.model.selectors[key] as SelectorInternal;
      if (selector.__deleteCache != null) {
        selector.__deleteCache(this.id);
      }
    });
  }
}
