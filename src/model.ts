import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { ExtractDependencies } from "./dependencies";
import { Effects, ExtractEffects } from "./effect";
import { Epics } from "./epic";
import { ExtractProps, PropsFactory } from "./props";
import { ExtractReducers, Reducers } from "./reducer";
import {
  ConvertSelectorsToGetters,
  ExtractSelectors,
  Selectors,
  SelectorsFactory
} from "./selector";
import { ExtractState, StateFactory } from "./state";

import { createSelector } from "./selector";
import { buildNamespace, functionWrapper } from "./util";

export interface Model<
  TDependencies = any,
  TProps = any,
  TState = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any
> {
  defaultProps: PropsFactory<TDependencies, TProps>;
  autoRegister: boolean;

  state: StateFactory<TDependencies, TProps, TState>;
  selectors: TSelectors;
  reducers: TReducers;
  effects: TEffects;
  epics: Epics<
    TDependencies,
    TProps,
    TState,
    ConvertSelectorsToGetters<TSelectors>,
    ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
  >;
}

export interface Models<TDependencies = any> {
  [key: string]:
    | Model<TDependencies>
    | Array<Model<TDependencies>>
    | Models<TDependencies>;
}

export type ExtractModel<T extends ModelBuilder> = ReturnType<T["build"]>;

export class ModelBuilder<
  TDependencies = any,
  TProps = any,
  TState = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any
> {
  private readonly _model: Model<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects
  >;
  private _isFrozen: boolean = false;

  constructor(
    model: Model<TDependencies, TProps, TState, TSelectors, TReducers, TEffects>
  ) {
    this._model = cloneModel(model);
  }

  public freeze(): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects
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
    TEffects
  > {
    return new ModelBuilder(this._model);
  }

  public extend<TModel extends Model>(
    model: TModel
  ): ModelBuilder<
    TDependencies extends undefined
      ? ExtractDependencies<TModel>
      : TDependencies & ExtractDependencies<TModel>,
    TProps extends undefined
      ? ExtractProps<TModel>
      : TProps & ExtractProps<TModel>,
    TState extends undefined
      ? ExtractState<TModel>
      : TState & ExtractState<TModel>,
    TSelectors & ExtractSelectors<TModel>,
    TReducers & ExtractReducers<TModel>,
    TEffects & ExtractEffects<TModel>
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

  public dependencies<T>(): ModelBuilder<
    TDependencies extends undefined ? T : TDependencies & T,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().dependencies<T>();
    }

    return this as any;
  }

  public props<T>(
    props: T | PropsFactory<TDependencies, T>
  ): ModelBuilder<
    TDependencies,
    TProps extends undefined ? T : TProps & T,
    TState,
    TSelectors,
    TReducers,
    TEffects
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

      return {
        ...oldProps,
        ...newProps
      };
    };

    return this as any;
  }

  public state<T>(
    state: T | StateFactory<TDependencies, TProps, T>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState extends undefined ? T : TState & T,
    TSelectors,
    TReducers,
    TEffects
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

      return {
        ...oldState,
        ...newState
      };
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
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().selectors(selectors);
    }

    if (typeof selectors === "function") {
      selectors = selectors(createSelector);
    }

    this._model.selectors = {
      ...this._model.selectors,
      ...selectors
    };

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
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().reducers(reducers);
    }

    this._model.reducers = {
      ...this._model.reducers,
      ...reducers
    };

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
    TEffects & T
  > {
    if (this._isFrozen) {
      return this.clone().effects(effects);
    }

    this._model.effects = {
      ...this._model.effects,
      ...effects
    };

    return this as any;
  }

  public epics(
    epics: Epics<
      TDependencies,
      TProps,
      TState,
      ConvertSelectorsToGetters<TSelectors>,
      ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
    >
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState,
    TSelectors,
    TReducers,
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().epics(epics);
    }

    this._model.epics = [...this._model.epics, ...epics];

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
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().autoRegister(value);
    }

    this._model.autoRegister = value;

    return this as any;
  }

  public build(
    props?: TProps | PropsFactory<TDependencies, TProps>
  ): Model<TDependencies, TProps, TState, TSelectors, TReducers, TEffects> {
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
    selectors: { ...model.selectors },
    reducers: { ...model.reducers },
    effects: { ...model.effects },
    epics: [...model.epics]
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
  {}
> {
  return new ModelBuilder({
    defaultProps: () => undefined,
    autoRegister: false,

    state: () => undefined,
    selectors: {},
    reducers: {},
    effects: {},
    epics: []
  });
}

export function registerModel<TModel extends Model>(
  storeCache: StoreCache,
  namespace: string,
  model: TModel | TModel[]
): void {
  const models = Array.isArray(model) ? model : [model];
  models.forEach((_model) => {
    if (storeCache.cacheByModel.has(_model)) {
      throw new Error("model is already registered");
    }

    storeCache.cacheByModel.set(_model, {
      baseNamespace: namespace,
      containerByKey: new Map()
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
      storeCache.useContainer(model).register();
    } else {
      registerModels(storeCache, modelNamespace, model as Models);
    }
  });
}
