import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { ExtractDependencies } from "./dependencies";
import { Effect, Effects, ExtractEffects } from "./effect";
import { Epics, ExtractEpics } from "./epic";
import { ExtractProps, PropsFactory } from "./props";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  Selectors,
  SelectorsFactory
} from "./selector";
import { ExtractState, StateFactory } from "./state";

import { createSelector } from "./selector";
import {
  buildNamespace,
  flattenFunctionObject,
  functionWrapper,
  merge
} from "./util";

export interface Model<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  defaultProps: PropsFactory<TDependencies, TProps>;
  autoRegister: boolean;

  state: StateFactory<TDependencies, TProps, TState>;
  selectors: TSelectors;
  reducers: TReducers;
  effects: TEffects;
  epics: TEpics;
}

export interface Models<TDependencies extends object | undefined = any> {
  [key: string]:
    | Model<TDependencies>
    | Array<Model<TDependencies>>
    | Models<TDependencies>;
}

export type ExtractModel<T extends ModelBuilder> = ReturnType<T["build"]>;

export class ModelBuilder<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  private readonly _model: Model<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  >;
  private _isFrozen: boolean = false;

  constructor(
    model: Model<
      TDependencies,
      TProps,
      TState,
      TSelectors,
      TReducers,
      TEffects,
      TEpics
    >
  ) {
    this._model = cloneModel(model);
  }

  public freeze(): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    this._isFrozen = true;
    return this;
  }

  public clone(): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    return new ModelBuilder(this._model);
  }

  public extend<TModel extends Model>(
    model: TModel
  ): ModelBuilder<
    TDependencies extends object
      ? TDependencies & ExtractDependencies<TModel>
      : ExtractDependencies<TModel>,
    TProps extends object
      ? TProps & ExtractProps<TModel>
      : ExtractProps<TModel>,
    TState extends object
      ? TState & ExtractState<TModel>
      : ExtractState<TModel>,
    TSelectors & ExtractSelectors<TModel>,
    TReducers & ExtractReducers<TModel>,
    TEffects & ExtractEffects<TModel>,
    TEpics & ExtractEpics<TModel>
  > {
    if (this._isFrozen) {
      return this.clone().extend(model);
    }

    this.dependencies()
      .props(model.defaultProps)
      .state(model.state)
      .selectors(model.selectors)
      .reducers(model.reducers)
      .effects(model.effects)
      .epics(model.epics)
      .autoRegister(model.autoRegister);

    return this as any;
  }

  public dependencies<T extends object>(): ModelBuilder<
    TDependencies extends object ? TDependencies & T : T,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().dependencies<T>();
    }

    return this as any;
  }

  public props<T extends object>(
    props: T | PropsFactory<TDependencies, T>
  ): ModelBuilder<
    TDependencies,
    TProps extends object ? TProps & T : T,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().props(props);
    }

    const oldPropsFn = this._model.defaultProps;
    const newPropsFn = functionWrapper(props);

    this._model.defaultProps = (context) => {
      const oldProps = oldPropsFn(context);
      const newProps = newPropsFn(context);

      if (oldProps === undefined && newProps === undefined) {
        return undefined!;
      }

      return merge({}, oldProps, newProps);
    };

    return this as any;
  }

  public overrideProps(
    override: (
      base: TProps
    ) => Partial<TProps> | PropsFactory<TDependencies, Partial<TProps>>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideProps(override);
    }

    const oldPropsFn = this._model.defaultProps;

    this._model.defaultProps = (context) => {
      const oldProps = oldPropsFn(context);
      const newProps = functionWrapper(override(oldProps))(context);

      if (oldProps === undefined && newProps === undefined) {
        return undefined!;
      }

      return merge({}, oldProps, newProps);
    };

    return this as any;
  }

  public state<T extends object>(
    state: T | StateFactory<TDependencies, TProps, T>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState extends object ? TState & T : T,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().state(state);
    }

    const oldStateFn = this._model.state;
    const newStateFn = functionWrapper(state);

    this._model.state = (context) => {
      const oldState = oldStateFn(context);
      const newState = newStateFn(context);

      if (oldState === undefined && newState === undefined) {
        return undefined!;
      }

      return merge({}, oldState, newState);
    };

    return this as any;
  }

  public overrideState(
    override: (
      base: TState
    ) => Partial<TState> | StateFactory<TDependencies, TProps, Partial<TState>>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideState(override);
    }

    const oldStateFn = this._model.state;

    this._model.state = (context) => {
      const oldState = oldStateFn(context);
      const newState = functionWrapper(override(oldState))(context);

      if (oldState === undefined && newState === undefined) {
        return undefined!;
      }

      return merge({}, oldState, newState);
    };

    return this as any;
  }

  public selectors<
    T extends Selectors<
      TDependencies,
      TProps,
      TState,
      ConvertSelectorsToGetters<TSelectors>,
      ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
    >
  >(
    selectors:
      | T
      | SelectorsFactory<
          TDependencies,
          TProps,
          TState,
          ConvertSelectorsToGetters<TSelectors>,
          ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>,
          T
        >
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors & T,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().selectors(selectors);
    }

    if (typeof selectors === "function") {
      selectors = selectors(createSelector);
    }

    this._model.selectors = merge({}, this._model.selectors, selectors);

    return this as any;
  }

  public overrideSelectors(
    override: (
      base: TSelectors
    ) =>
      | Partial<TSelectors>
      | SelectorsFactory<
          TDependencies,
          TProps,
          TState,
          ConvertSelectorsToGetters<TSelectors>,
          ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>,
          Partial<TSelectors>
        >
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideSelectors(override);
    }

    let selectors = override(this._model.selectors);
    if (typeof selectors === "function") {
      selectors = selectors(createSelector);
    }

    this._model.selectors = merge({}, this._model.selectors, selectors);

    return this as any;
  }

  public reducers<T extends Reducers<TDependencies, TProps, TState>>(
    reducers: T
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers & T,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().reducers(reducers);
    }

    this._model.reducers = merge({}, this._model.reducers, reducers);

    return this as any;
  }

  public overrideReducers(
    override: (base: TReducers) => Partial<TReducers>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideReducers(override);
    }

    this._model.reducers = merge(
      {},
      this._model.reducers,
      override(this._model.reducers)
    );

    return this as any;
  }

  public effects<
    T extends Effects<
      TDependencies,
      TProps,
      TState,
      ConvertSelectorsToGetters<TSelectors>,
      ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
    >
  >(
    effects: T
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects & T,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().effects(effects);
    }

    this._model.effects = merge({}, this._model.effects, effects);

    return this as any;
  }

  public overrideEffects(
    override: (base: TEffects) => Partial<TEffects>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideEffects(override);
    }

    this._model.effects = merge(
      {},
      this._model.effects,
      override(this._model.effects)
    );

    return this as any;
  }

  public epics<
    T extends Epics<
      TDependencies,
      TProps,
      TState,
      ConvertSelectorsToGetters<TSelectors>,
      ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
    >
  >(
    epics: T
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics & T
  > {
    if (this._isFrozen) {
      return this.clone().epics(epics);
    }

    this._model.epics = merge({}, this._model.epics, epics);

    return this as any;
  }

  public overrideEpics(
    override: (base: TEpics) => Partial<TEpics>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideEpics(override);
    }

    this._model.epics = merge(
      {},
      this._model.epics,
      override(this._model.epics)
    );

    return this as any;
  }

  public autoRegister(
    value: boolean = true
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().autoRegister(value);
    }

    this._model.autoRegister = value;

    return this as any;
  }

  public build(
    props?: TProps | PropsFactory<TDependencies, TProps>
  ): Model<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    const model = cloneModel(this._model);
    if (props !== undefined) {
      model.defaultProps = functionWrapper(props);
    }

    return model;
  }
}

function cloneModel<T extends Model>(model: T): T {
  return {
    defaultProps: model.defaultProps,
    autoRegister: model.autoRegister,

    state: model.state,
    selectors: merge({}, model.selectors),
    reducers: merge({}, model.reducers),
    effects: merge({}, model.effects),
    epics: merge({}, model.epics)
  } as T;
}

export function isModel(obj: any): obj is Model {
  const model = obj as Model;
  return (
    model != null &&
    model.defaultProps != null &&
    model.autoRegister != null &&
    model.state != null &&
    model.selectors != null &&
    model.reducers != null &&
    model.effects != null &&
    model.epics != null &&
    typeof model.defaultProps === "function" &&
    typeof model.autoRegister === "boolean" &&
    typeof model.state === "function"
  );
}

export function createModelBuilder(): ModelBuilder<
  undefined,
  undefined,
  undefined,
  {},
  {},
  {},
  {}
> {
  return new ModelBuilder({
    defaultProps: () => undefined,
    autoRegister: false,

    state: () => undefined,
    selectors: {},
    reducers: {},
    effects: {},
    epics: {}
  });
}

export function registerModel<TModel extends Model>(
  storeCache: StoreCache,
  namespace: string,
  model: TModel | TModel[]
): void {
  const models = Array.isArray(model) ? model : [model];
  models.forEach((_model) => {
    if (storeCache.contextByModel.has(_model)) {
      throw new Error("model is already registered");
    }

    const reducerByActionName: { [name: string]: Reducer } = {};
    flattenFunctionObject<Reducer>(_model.reducers).forEach(
      ({ paths, value }) => {
        const actionName = storeCache.options.resolveActionName!(paths);
        if (reducerByActionName[actionName] != null) {
          throw new Error("action name of reducer should be unique");
        }

        reducerByActionName[actionName] = value;
      }
    );

    const effectByActionName: { [name: string]: Effect } = {};
    flattenFunctionObject<Effect>(_model.effects).forEach(
      ({ paths, value }) => {
        const actionName = storeCache.options.resolveActionName!(paths);
        if (effectByActionName[actionName] != null) {
          throw new Error("action name of effect should be unique");
        }

        effectByActionName[actionName] = value;
      }
    );

    storeCache.contextByModel.set(_model, {
      baseNamespace: namespace,
      cacheIdByKey: new Map(),

      reducerByActionName,
      effectByActionName
    });
  });
}

export function registerModels(
  storeCache: StoreCache,
  namespace: string,
  models: Models
): void {
  Object.keys(models).forEach((key) => {
    const model = models[key];
    const modelNamespace = buildNamespace(namespace, key);

    if (Array.isArray(model)) {
      registerModel(storeCache, modelNamespace, model);
    } else if (isModel(model)) {
      registerModel(storeCache, modelNamespace, model);
      storeCache.getContainer(model).register();
    } else {
      registerModels(storeCache, modelNamespace, model as Models);
    }
  });
}
