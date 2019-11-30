import {
  ExtractActionHelpers,
  registerActionHelper,
  RegisterOptions,
} from "./action";
import { ArgsFactory, ExtractArgs, ModelArgs } from "./args";
import { StoreContext } from "./context";
import { ExtractDependencies } from "./dependencies";
import { Effect, Effects, ExtractEffects, OverrideEffects } from "./effect";
import { Epic, Epics, ExtractEpics, OverrideEpics } from "./epic";
import {
  ExtractReducers,
  OverrideReducers,
  Reducer,
  Reducers,
} from "./reducer";
import {
  createSelector,
  ExtractGetters,
  ExtractSelectors,
  OutputSelector,
  OverrideSelectors,
  Selectors,
  SelectorsFactory,
} from "./selector";
import { ExtractState, StateFactory } from "./state";
import {
  assignObjectDeeply,
  convertNamespaceToPath,
  DeepPartial,
  joinLastPart,
  merge,
  wrapFunctionFactory,
} from "./util";

export interface ModelOptions {
  autoRegister?: boolean;
}

export interface Model<
  TDependencies = any,
  TArgs extends object = any,
  TState extends object = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  options: ModelOptions;

  args: ArgsFactory<TDependencies, TArgs>;
  state: StateFactory<TDependencies, TArgs, TState>;
  selectors: TSelectors;
  reducers: TReducers;
  effects: TEffects;
  epics: TEpics;
}

export interface Models<TDependencies = any> {
  [key: string]:
    | Model<TDependencies>
    | Array<Model<TDependencies>>
    | Models<TDependencies>;
}

export type ExtractModel<T extends ModelBuilder> = ReturnType<T["build"]>;

export function cloneModel<T extends Model>(model: T): T {
  return {
    options: merge({}, model.options),

    args: model.args,
    state: model.state,
    selectors: merge({}, model.selectors),
    reducers: merge({}, model.reducers),
    effects: merge({}, model.effects),
    epics: merge({}, model.epics),
  } as T;
}

export class ModelBuilder<
  TDependencies = any,
  TArgs extends object = any,
  TState extends object = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  private static readonly _globalId = Date.now();
  private static _nextAnonymousEpicId = 1;

  private readonly _model: Model<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  >;
  private _isFrozen = false;

  constructor(
    model: Model<
      TDependencies,
      TArgs,
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
    TArgs,
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
    TArgs,
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
    TDependencies & ExtractDependencies<TModel>,
    TArgs & ExtractArgs<TModel>,
    TState & ExtractState<TModel>,
    TSelectors & ExtractSelectors<TModel>,
    TReducers & ExtractReducers<TModel>,
    TEffects & ExtractEffects<TModel>,
    TEpics & ExtractEpics<TModel>
  >;
  public extend<TModel extends Model, TSubKey extends string>(
    model: TModel,
    subKey: TSubKey
  ): ModelBuilder<
    TDependencies & ExtractDependencies<TModel>,
    TArgs & { [P in TSubKey]: ExtractArgs<TModel> },
    TState & { [P in TSubKey]: ExtractState<TModel> },
    TSelectors & { [P in TSubKey]: ExtractSelectors<TModel> },
    TReducers & { [P in TSubKey]: ExtractReducers<TModel> },
    TEffects & { [P in TSubKey]: ExtractEffects<TModel> },
    TEpics & { [P in TSubKey]: ExtractEpics<TModel> }
  >;
  public extend(model: Model, subKey?: string) {
    if (this._isFrozen) {
      return this.clone().extend(model, subKey!);
    }

    let args = model.args;
    let state = model.state;
    let selectors = model.selectors;
    let reducers = model.reducers;
    let effects = model.effects;
    let epics = model.epics;
    let options = model.options;

    if (subKey !== undefined) {
      args = (context) => ({
        [subKey]: model.args({
          ...context,
        }),
      });

      state = (context) => ({
        [subKey]: model.state({
          ...context,
          args: context.args?.[subKey],
        }),
      });

      selectors = {
        [subKey]: assignObjectDeeply(
          {},
          model.selectors,
          (oldSelector: OutputSelector) => {
            const newSelector: OutputSelector = (context, cache) =>
              oldSelector(
                {
                  ...context,
                  getState: () => context.getState()?.[subKey],
                  getters: context.getters[subKey],
                  actions: context.actions[subKey],
                },
                cache
              );

            return newSelector;
          }
        ),
      };

      reducers = {
        [subKey]: assignObjectDeeply(
          {},
          model.reducers,
          (oldReducer: Reducer) => {
            const newReducer: Reducer = (_state, payload, context) =>
              oldReducer(_state[subKey], payload, {
                ...context,
              });

            return newReducer;
          }
        ),
      };

      effects = {
        [subKey]: assignObjectDeeply({}, model.effects, (oldEffect: Effect) => {
          const newEffect: Effect = (context, payload) =>
            oldEffect(
              {
                ...context,
                getState: () => context.getState()?.[subKey],
                getters: context.getters[subKey],
                actions: context.actions[subKey],
              },
              payload
            );

          return newEffect;
        }),
      };

      epics = {
        [subKey]: assignObjectDeeply({}, model.epics, (oldEpic: Epic) => {
          const newEpic: Epic = (context) =>
            oldEpic({
              ...context,
              getState: () => context.getState()?.[subKey],
              getters: context.getters[subKey],
              actions: context.actions[subKey],
            });

          return newEpic;
        }),
      };

      options = { ...options };
      delete options.autoRegister;
    }

    this.dependencies()
      .args(args)
      .state(state)
      .selectors(selectors)
      .reducers(reducers)
      .effects(effects)
      .epics(epics)
      .options(options);

    return this as any;
  }

  public dependencies<T>(): ModelBuilder<
    TDependencies & T,
    TArgs,
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

  public args<T extends object>(
    args: T | ArgsFactory<TDependencies, T>
  ): ModelBuilder<
    TDependencies,
    TArgs & ModelArgs<T>,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().args(args);
    }

    const oldArgsFn = this._model.args;
    const newArgsFn = wrapFunctionFactory(args);

    this._model.args = (context) => {
      const oldArgs = oldArgsFn(context);
      const newArgs = newArgsFn(context);

      return merge({}, oldArgs, newArgs);
    };

    return this as any;
  }

  public overrideArgs(
    override: (
      base: TArgs
    ) => DeepPartial<TArgs> | ArgsFactory<TDependencies, DeepPartial<TArgs>>
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideArgs(override);
    }

    const oldArgsFn = this._model.args;

    this._model.args = (context) => {
      const oldArgs = oldArgsFn(context);
      const newArgs = wrapFunctionFactory(override(oldArgs))(context);

      return merge({}, oldArgs, newArgs);
    };

    return this as any;
  }

  public state<T extends object>(
    state: T | StateFactory<TDependencies, TArgs, T>
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState & T,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().state(state);
    }

    const oldStateFn = this._model.state;
    const newStateFn = wrapFunctionFactory(state);

    this._model.state = (context) => {
      const oldState = oldStateFn(context);
      const newState = newStateFn(context);

      return merge({}, oldState, newState);
    };

    return this as any;
  }

  public overrideState(
    override: (
      base: TState
    ) =>
      | DeepPartial<TState>
      | StateFactory<TDependencies, TArgs, DeepPartial<TState>>
  ): ModelBuilder<
    TDependencies,
    TArgs,
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
      const newState = wrapFunctionFactory(override(oldState))(context);

      return merge({}, oldState, newState);
    };

    return this as any;
  }

  public selectors<
    T extends Selectors<
      TDependencies,
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >
  >(
    selectors:
      | T
      | SelectorsFactory<
          TDependencies,
          TState,
          ExtractGetters<TSelectors>,
          ExtractActionHelpers<TReducers, TEffects>,
          T
        >
  ): ModelBuilder<
    TDependencies,
    TArgs,
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
      | DeepPartial<
          OverrideSelectors<
            TSelectors,
            TDependencies,
            TState,
            ExtractGetters<TSelectors>,
            ExtractActionHelpers<TReducers, TEffects>
          >
        >
      | SelectorsFactory<
          TDependencies,
          TState,
          ExtractGetters<TSelectors>,
          ExtractActionHelpers<TReducers, TEffects>,
          DeepPartial<
            OverrideSelectors<
              TSelectors,
              TDependencies,
              TState,
              ExtractGetters<TSelectors>,
              ExtractActionHelpers<TReducers, TEffects>
            >
          >
        >
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    OverrideSelectors<
      TSelectors,
      TDependencies,
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >,
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

  public reducers<T extends Reducers<TDependencies, TState>>(
    reducers: T
  ): ModelBuilder<
    TDependencies,
    TArgs,
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
    override: (
      base: TReducers
    ) => DeepPartial<OverrideReducers<TReducers, TDependencies, TState>>
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    OverrideReducers<TReducers, TDependencies, TState>,
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
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >
  >(
    effects: T
  ): ModelBuilder<
    TDependencies,
    TArgs,
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
    override: (
      base: TEffects
    ) => DeepPartial<
      OverrideEffects<
        TEffects,
        TDependencies,
        TState,
        ExtractGetters<TSelectors>,
        ExtractActionHelpers<TReducers, TEffects>
      >
    >
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    OverrideEffects<
      TEffects,
      TDependencies,
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >,
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
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >
  >(
    epics:
      | T
      | Array<
          Epic<
            TDependencies,
            TState,
            ExtractGetters<TSelectors>,
            ExtractActionHelpers<TReducers, TEffects>
          >
        >
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics & T
  > {
    if (this._isFrozen) {
      return this.clone().epics(epics);
    }

    if (Array.isArray(epics)) {
      epics = epics.reduce<{ [key: string]: Epic }>((obj, epic) => {
        obj[
          `@@REDUX_ADVANCED_ANONYMOUS_EPIC_${ModelBuilder._globalId}_${ModelBuilder._nextAnonymousEpicId}`
        ] = epic;
        ModelBuilder._nextAnonymousEpicId += 1;
        return obj;
      }, {}) as T;
    }

    this._model.epics = merge({}, this._model.epics, epics);

    return this as any;
  }

  public overrideEpics(
    override: (
      base: TEpics
    ) => DeepPartial<
      OverrideEpics<
        TEpics,
        TDependencies,
        TState,
        ExtractGetters<TSelectors>,
        ExtractActionHelpers<TReducers, TEffects>
      >
    >
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    OverrideEpics<
      TEpics,
      TDependencies,
      TState,
      ExtractGetters<TSelectors>,
      ExtractActionHelpers<TReducers, TEffects>
    >
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

  public options(
    options: ModelOptions
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().options(options);
    }

    this._model.options = merge({}, this._model.options, options);

    return this as any;
  }

  public overrideOptions(
    override: (base: ModelOptions) => DeepPartial<ModelOptions>
  ): ModelBuilder<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    if (this._isFrozen) {
      return this.clone().overrideOptions(override);
    }

    this._model.options = merge(
      {},
      this._model.options,
      override(this._model.options)
    );

    return this as any;
  }

  public build(): Model<
    TDependencies,
    TArgs,
    TState,
    TSelectors,
    TReducers,
    TEffects,
    TEpics
  > {
    return cloneModel(this._model);
  }
}

export function isModel(obj: any): obj is Model {
  const model = obj as Model;
  return model != null && typeof model.state === "function";
}

export function createModelBuilder(): ModelBuilder<{}, {}, {}, {}, {}, {}, {}> {
  return new ModelBuilder({
    options: {},

    args: () => ({}),
    state: () => ({}),
    selectors: {},
    reducers: {},
    effects: {},
    epics: {},
  });
}

export function registerModel<TModel extends Model>(
  storeContext: StoreContext,
  namespace: string,
  model: TModel | TModel[]
): void {
  const models = Array.isArray(model) ? model : [model];

  let registeredModels = storeContext.modelsByBaseNamespace.get(namespace);
  if (registeredModels == null) {
    registeredModels = [];
    storeContext.modelsByBaseNamespace.set(namespace, registeredModels);
  }

  models.forEach((_model) => {
    if (storeContext.contextByModel.has(_model)) {
      throw new Error("Failed to register model: model is already registered");
    }

    const reducerByActionName = new Map<string, Reducer>();
    assignObjectDeeply({}, _model.reducers, (reducer, paths) => {
      const actionName = storeContext.resolveActionName(paths);
      if (reducerByActionName.has(actionName)) {
        throw new Error(
          "Failed to register model: action name of reducer should be unique"
        );
      }
      reducerByActionName.set(actionName, reducer);
    });

    const effectByActionName = new Map<string, Effect>();
    assignObjectDeeply({}, _model.effects, (effect, paths) => {
      const actionName = storeContext.resolveActionName(paths);
      if (effectByActionName.has(actionName)) {
        throw new Error(
          "Failed to register model: action name of effect should be unique"
        );
      }
      effectByActionName.set(actionName, effect);
    });

    storeContext.contextByModel.set(_model, {
      isDynamic: Array.isArray(model),
      modelIndex: registeredModels!.length,

      baseNamespace: namespace,
      basePath: convertNamespaceToPath(namespace),

      reducerByActionName,
      effectByActionName,

      containerByKey: new Map(),
    });

    registeredModels!.push(_model);
  });
}

export function registerModels(
  storeContext: StoreContext,
  namespace: string,
  models: Models
): RegisterOptions[] {
  const registerOptionsList: RegisterOptions[] = [];

  Object.keys(models).forEach((key) => {
    const model = models[key];
    const modelNamespace = joinLastPart(namespace, key);

    if (Array.isArray(model)) {
      registerModel(storeContext, modelNamespace, model);
    } else if (isModel(model)) {
      registerModel(storeContext, modelNamespace, model);
      registerOptionsList.push({
        namespace: modelNamespace,
      });
    } else {
      registerOptionsList.push(
        ...registerModels(storeContext, modelNamespace, model as Models)
      );
    }
  });

  return registerOptionsList;
}

export type RegisterModels = (models: Models) => void;
export function createRegisterModels(
  storeContext: StoreContext
): RegisterModels {
  return (models) => {
    const registerOptionsList = registerModels(storeContext, "", models);
    storeContext.store.dispatch(
      registerActionHelper.create(registerOptionsList)
    );
  };
}

export function generateNamespaceModelMappings(models: Models, prefix = "") {
  const mappings: Record<string, Model> = {};

  Object.keys(models).forEach((key) => {
    const model = models[key];
    const namespace = joinLastPart(prefix, key);

    if (Array.isArray(model)) {
      model.forEach((item, index) => {
        mappings[joinLastPart(namespace, "" + index)] = item;
      });
    } else if (isModel(model)) {
      mappings[namespace] = model;
    } else {
      Object.assign(mappings, generateNamespaceModelMappings(model, namespace));
    }
  });

  return mappings;
}
