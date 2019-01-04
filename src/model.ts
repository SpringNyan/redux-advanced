import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { Effects } from "./effect";
import { Epics } from "./epic";
import { Reducers } from "./reducer";
import { ConvertSelectorsToGetters, Selectors } from "./selector";
import { StateFactory } from "./state";

import { getStoreCache } from "./cache";

export interface Model<
  TDependencies = any,
  TProps = any,
  TState = any,
  TSelectors extends Selectors<TDependencies, TProps> = any,
  TReducers extends Reducers<TDependencies, TProps> = any,
  TEffects extends Effects<TDependencies, TProps> = any
> {
  defaultProps: TProps;

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

export type ExtractDependencies<T extends Model> = T extends Model<
  infer TDependencies,
  any,
  any,
  any,
  any,
  any
>
  ? TDependencies
  : never;

export type ExtractProps<T extends Model> = T extends Model<
  any,
  infer TProps,
  any,
  any,
  any,
  any
>
  ? TProps
  : never;

export class ModelBuilder<
  TDependencies = any,
  TProps = any,
  TState = any,
  TSelectors extends Selectors<TDependencies, TProps> = any,
  TReducers extends Reducers<TDependencies, TProps> = any,
  TEffects extends Effects<TDependencies, TProps> = any
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

  public dependencies<T>(): ModelBuilder<
    TDependencies & T,
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
    defaultProps: T
  ): ModelBuilder<
    TDependencies,
    TProps & T,
    TState,
    TSelectors,
    TReducers,
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().props(defaultProps);
    }

    this._model.defaultProps = {
      ...this._model.defaultProps,
      ...defaultProps
    };

    return this as any;
  }

  public state<T>(
    state: T | StateFactory<TDependencies, TProps, T>
  ): ModelBuilder<
    TDependencies,
    TProps,
    TState & T,
    TSelectors,
    TReducers,
    TEffects
  > {
    if (this._isFrozen) {
      return this.clone().state(state);
    }

    const oldState = this._model.state;
    const newState = functionWrapper(state);

    this._model.state = (context) => ({
      ...oldState(context),
      ...newState(context)
    });

    return this as any;
  }

  public selectors<
    T extends Selectors<
      TState,
      ConvertSelectorsToGetters<TSelectors>,
      ConvertReducersAndEffectsToActionHelpers<TReducers, TEffects>
    >
  >(
    selectors: T
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

    this._model.selectors = {
      ...this._model.selectors,
      ...selectors
    };

    return this as any;
  }

  public reducers<T extends Reducers<TState>>(
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

  public build(
    props?: TProps
  ): Model<TDependencies, TProps, TState, TSelectors, TReducers, TEffects> {
    const model = cloneModel(this._model);
    if (props !== undefined) {
      model.defaultProps = props;
    }

    return model;
  }
}

function functionWrapper<T, U extends any[]>(
  obj: T | ((...args: U) => T)
): ((...args: U) => T) {
  return typeof obj === "function" ? (obj as (...args: U) => T) : () => obj;
}

function cloneModel<T extends Model>(model: T): T {
  return {
    defaultProps: { ...model.defaultProps },

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
    model.state != null &&
    model.selectors != null &&
    model.reducers != null &&
    model.effects != null &&
    model.epics != null &&
    typeof model.state === "function"
  );
}

export function createModelBuilder(): ModelBuilder<{}, {}, {}, {}, {}, {}> {
  return new ModelBuilder({
    defaultProps: {},

    state: () => ({}),
    selectors: {},
    reducers: {},
    effects: {},
    epics: []
  });
}

export function registerModel<TModel extends Model>(
  storeId: number,
  model: TModel | TModel[],
  namespace: string
): void {
  const { cacheByModel } = getStoreCache(storeId);

  const models = Array.isArray(model) ? model : [model];
  models.forEach((mod) => {
    if (cacheByModel.has(mod)) {
      throw new Error("model is already registered");
    }

    cacheByModel.set(mod, {
      namespace,
      containers: {}
    });
  });
}
