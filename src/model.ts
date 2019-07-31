import {
  batchRegisterActionHelper,
  ExtractActionHelpersFromReducersEffects,
  RegisterPayload
} from "./action";
import { ArgsFactory, ExtractArgs, ToArgs } from "./args";
import { StoreContext } from "./context";
import { ExtractDependencies } from "./dependencies";
import { Effect, Effects, ExtractEffects, OverrideEffects } from "./effect";
import { Epic, Epics, ExtractEpics, OverrideEpics } from "./epic";
import {
  ExtractReducers,
  OverrideReducers,
  Reducer,
  Reducers
} from "./reducer";
import {
  createSelector,
  ExtractGettersFromSelectors,
  ExtractSelectors,
  OverrideSelectors,
  SelectorInternal,
  Selectors,
  SelectorsFactory
} from "./selector";
import { ExtractState, StateFactory } from "./state";
import {
  DeepPartial,
  factoryWrapper,
  joinLastPart,
  mapObjectDeeply,
  merge
} from "./util";

export interface Model<
  TDependencies extends object | undefined = any,
  TArgs extends object | undefined = any,
  TState extends object | undefined = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  autoRegister: boolean;

  args: ArgsFactory<TDependencies, TArgs>;
  state: StateFactory<TDependencies, TArgs, TState>;
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
  TArgs extends object | undefined = any,
  TState extends object | undefined = any,
  TSelectors extends Selectors = any,
  TReducers extends Reducers = any,
  TEffects extends Effects = any,
  TEpics extends Epics = any
> {
  private static _nextEpicId: number = 1;

  private readonly _model: Model<
    TDependencies,
    TArgs,
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
    TDependencies extends object
      ? TDependencies & ExtractDependencies<TModel>
      : ExtractDependencies<TModel>,
    TArgs extends object ? TArgs & ExtractArgs<TModel> : ExtractArgs<TModel>,
    TState extends object
      ? TState & ExtractState<TModel>
      : ExtractState<TModel>,
    TSelectors & ExtractSelectors<TModel>,
    TReducers & ExtractReducers<TModel>,
    TEffects & ExtractEffects<TModel>,
    TEpics & ExtractEpics<TModel>
  >;
  public extend<TModel extends Model, TNamespace extends string>(
    model: TModel,
    namespace: TNamespace
  ): ModelBuilder<
    TDependencies extends object
      ? TDependencies & ExtractDependencies<TModel>
      : ExtractDependencies<TModel>,
    TArgs extends object
      ? TArgs &
          (ExtractArgs<TModel> extends object
            ? { [P in TNamespace]: ExtractArgs<TModel> }
            : {})
      : (ExtractArgs<TModel> extends object
          ? { [P in TNamespace]: ExtractArgs<TModel> }
          : {}),
    TState extends object
      ? TState &
          (ExtractState<TModel> extends object
            ? { [P in TNamespace]: ExtractState<TModel> }
            : {})
      : (ExtractState<TModel> extends object
          ? { [P in TNamespace]: ExtractState<TModel> }
          : {}),
    TSelectors & { [P in TNamespace]: ExtractSelectors<TModel> },
    TReducers & { [P in TNamespace]: ExtractReducers<TModel> },
    TEffects & { [P in TNamespace]: ExtractEffects<TModel> },
    TEpics & { [P in TNamespace]: ExtractEpics<TModel> }
  >;
  public extend(model: Model, namespace?: string) {
    if (this._isFrozen) {
      return this.clone().extend(model, namespace!);
    }

    let args = model.args;
    let state = model.state;
    let selectors = model.selectors;
    let reducers = model.reducers;
    let effects = model.effects;
    let epics = model.epics;

    if (namespace !== undefined) {
      args = (context) => ({
        [namespace]: model.args({
          ...context
        })
      });

      state = (context) => ({
        [namespace]: model.state({
          ...context,
          args: (context.args || {})[namespace]
        })
      });

      selectors = {
        [namespace]: mapObjectDeeply(
          {},
          model.selectors,
          (oldSelector: SelectorInternal) => {
            const newSelector: SelectorInternal = (context, cache) =>
              oldSelector(
                {
                  ...context,
                  getState: () => (context.getState() || {})[namespace],
                  getters: context.getters[namespace],
                  actions: context.actions[namespace]
                },
                cache
              );

            return newSelector;
          }
        )
      };

      reducers = {
        [namespace]: mapObjectDeeply(
          {},
          model.reducers,
          (oldReducer: Reducer) => {
            const newReducer: Reducer = (_state, payload, context) =>
              oldReducer(_state[namespace], payload, {
                ...context,
                originalState: (context.originalState || {})[namespace]
              });

            return newReducer;
          }
        )
      };

      effects = {
        [namespace]: mapObjectDeeply({}, model.effects, (oldEffect: Effect) => {
          const newEffect: Effect = (context, payload) =>
            oldEffect(
              {
                ...context,
                getState: () => (context.getState() || {})[namespace],
                getters: context.getters[namespace],
                actions: context.actions[namespace]
              },
              payload
            );

          return newEffect;
        })
      };

      epics = {
        [namespace]: mapObjectDeeply({}, model.epics, (oldEpic: Epic) => {
          const newEpic: Epic = (context) =>
            oldEpic({
              ...context,
              getState: () => (context.getState() || {})[namespace],
              getters: context.getters[namespace],
              actions: context.actions[namespace]
            });

          return newEpic;
        })
      };
    }

    this.dependencies()
      .args(args)
      .state(state)
      .selectors(selectors)
      .reducers(reducers)
      .effects(effects)
      .epics(epics);

    return this as any;
  }

  public dependencies<T extends object>(): ModelBuilder<
    TDependencies extends object ? TDependencies & T : T,
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
    TArgs extends object ? TArgs & ToArgs<T> : ToArgs<T>,
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
    const newArgsFn = factoryWrapper(args);

    this._model.args = (context) => {
      const oldArgs = oldArgsFn(context);
      const newArgs = newArgsFn(context);

      if (oldArgs === undefined && newArgs === undefined) {
        return undefined!;
      }

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
      const newArgs = factoryWrapper(override(oldArgs))(context);

      if (oldArgs === undefined && newArgs === undefined) {
        return undefined!;
      }

      return merge({}, oldArgs, newArgs);
    };

    return this as any;
  }

  public state<T extends object>(
    state: T | StateFactory<TDependencies, TArgs, T>
  ): ModelBuilder<
    TDependencies,
    TArgs,
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
    const newStateFn = factoryWrapper(state);

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
      const newState = factoryWrapper(override(oldState))(context);

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
      TState,
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
    >
  >(
    selectors:
      | T
      | SelectorsFactory<
          TDependencies,
          TState,
          ExtractGettersFromSelectors<TSelectors>,
          ExtractActionHelpersFromReducersEffects<TReducers, TEffects>,
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
            ExtractGettersFromSelectors<TSelectors>,
            ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
          >
        >
      | SelectorsFactory<
          TDependencies,
          TState,
          ExtractGettersFromSelectors<TSelectors>,
          ExtractActionHelpersFromReducersEffects<TReducers, TEffects>,
          DeepPartial<
            OverrideSelectors<
              TSelectors,
              TDependencies,
              TState,
              ExtractGettersFromSelectors<TSelectors>,
              ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
        ExtractGettersFromSelectors<TSelectors>,
        ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
    >
  >(
    epics:
      | T
      | Array<
          Epic<
            TDependencies,
            TState,
            ExtractGettersFromSelectors<TSelectors>,
            ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
        obj["$$EPIC_" + ModelBuilder._nextEpicId] = epic;
        ModelBuilder._nextEpicId += 1;
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
        ExtractGettersFromSelectors<TSelectors>,
        ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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
      ExtractGettersFromSelectors<TSelectors>,
      ExtractActionHelpersFromReducersEffects<TReducers, TEffects>
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

  public autoRegister(
    value: boolean = true
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
      return this.clone().autoRegister(value);
    }

    this._model.autoRegister = value;

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

function cloneModel<T extends Model>(model: T): T {
  return {
    autoRegister: model.autoRegister,

    args: model.args,
    state: model.state,
    selectors: merge({}, model.selectors),
    reducers: merge({}, model.reducers),
    effects: merge({}, model.effects),
    epics: merge({}, model.epics)
  } as T;
}

export function isModel(obj: any): obj is Model {
  const model = obj as Model;
  return model != null && typeof model.state === "function";
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
    autoRegister: false,

    args: () => undefined,
    state: () => undefined,
    selectors: {},
    reducers: {},
    effects: {},
    epics: {}
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
  registeredModels.push(...models);

  models.forEach((_model) => {
    if (storeContext.contextByModel.has(_model)) {
      throw new Error("model is already registered");
    }

    const reducerByActionName = new Map<string, Reducer>();
    mapObjectDeeply({}, _model.reducers, (reducer, paths) => {
      const actionName = storeContext.options.resolveActionName!(paths);
      if (reducerByActionName.has(actionName)) {
        throw new Error("action name of reducer should be unique");
      }

      reducerByActionName.set(actionName, reducer);
    });

    const effectByActionName = new Map<string, Effect>();
    mapObjectDeeply({}, _model.effects, (effect, paths) => {
      const actionName = storeContext.options.resolveActionName!(paths);
      if (effectByActionName.has(actionName)) {
        throw new Error("action name of effect should be unique");
      }

      effectByActionName.set(actionName, effect);
    });

    storeContext.contextByModel.set(_model, {
      baseNamespace: namespace,
      isDynamic: Array.isArray(model),

      reducerByActionName,
      effectByActionName,

      idByKey: new Map()
    });
  });
}

export function registerModels(
  storeContext: StoreContext,
  namespace: string,
  models: Models
): RegisterPayload[] {
  const payloads: RegisterPayload[] = [];

  Object.keys(models).forEach((key) => {
    const model = models[key];
    const modelNamespace = joinLastPart(namespace, key);

    if (Array.isArray(model)) {
      registerModel(storeContext, modelNamespace, model);
    } else if (isModel(model)) {
      registerModel(storeContext, modelNamespace, model);
      payloads.push({
        namespace: modelNamespace
      });
    } else {
      const childPayloads = registerModels(
        storeContext,
        modelNamespace,
        model as Models
      );
      payloads.push(...childPayloads);
    }
  });

  return payloads;
}

export type RegisterModels = (models: Models) => void;

export function createRegisterModels(
  storeContext: StoreContext
): RegisterModels {
  return (models) => {
    const payloads = registerModels(storeContext, "", models);
    storeContext.store.dispatch(batchRegisterActionHelper.create(payloads));
  };
}
