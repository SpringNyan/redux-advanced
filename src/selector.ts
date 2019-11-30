import { Observable } from "rxjs";
import { ActionHelpers, AnyAction } from "./action";
import { ContainerImpl, GetContainer } from "./container";
import { StoreContext } from "./context";
import { Model } from "./model";
import { assignObjectDeeply, DeepPartial } from "./util";

export interface SelectorContext<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  rootAction$: Observable<AnyAction>;
  rootState$: Observable<any>;

  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getState: () => TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Selector<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> = (
  context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>
) => TResult;

export type InputSelector<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> = (
  context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>,
  oldValue: TResult | undefined
) => TResult;

export interface SelectorCache {
  lastArgs?: any[];
  lastResult?: any;
}

export type OutputSelector<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> = (
  context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>,
  cache?: SelectorCache
) => TResult;

export interface Selectors<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]:
    | Selector<TDependencies, TState, TGetters, TActionHelpers>
    | Selectors<TDependencies, TState, TGetters, TActionHelpers>;
}

export type SelectorsFactory<
  TDependencies,
  TState extends object,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers,
  TSelectors extends DeepPartial<
    Selectors<TDependencies, TState, TGetters, TActionHelpers>
  >
> = (
  createSelector: CreateSelector<
    TDependencies,
    TState,
    TGetters,
    TActionHelpers
  >
) => TSelectors;

export interface Getters {
  [name: string]: any;
}

export type ExtractSelectorResult<T extends Selector> = T extends Selector<
  any,
  any,
  any,
  any,
  infer TResult
>
  ? TResult
  : never;

export type ExtractGetters<TSelectors extends Selectors> = {
  [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any
    ? ExtractSelectorResult<TSelectors[P]>
    : TSelectors[P] extends {}
    ? ExtractGetters<TSelectors[P]>
    : never;
};

export type ExtractSelectors<T extends Model> = T extends Model<
  any,
  any,
  any,
  infer TSelectors,
  any,
  any,
  any
>
  ? TSelectors
  : never;

export type OverrideSelectors<
  TSelectors,
  TDependencies,
  TState extends object,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any
    ? Selector<
        TDependencies,
        TState,
        TGetters,
        TActionHelpers,
        ExtractSelectorResult<TSelectors[P]>
      >
    : OverrideSelectors<
        TSelectors[P],
        TDependencies,
        TState,
        TGetters,
        TActionHelpers
      >;
};

export interface CreateSelector<
  TDependencies = any,
  TState extends object = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  <TResult>(
    combiner: (
      context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>,
      oldValue: TResult | undefined
    ) => TResult
  ): OutputSelector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
  <
    T extends
      | Array<
          InputSelector<TDependencies, TState, TGetters, TActionHelpers, any>
        >
      | [InputSelector<TDependencies, TState, TGetters, TActionHelpers, any>],
    TResult
  >(
    selectors: T,
    combiner: (
      args: {
        [P in keyof T]: T[P] extends InputSelector<
          TDependencies,
          TState,
          TGetters,
          TActionHelpers,
          any
        >
          ? ReturnType<T[P]>
          : never;
      },
      context: SelectorContext<TDependencies, TState, TGetters, TActionHelpers>,
      oldValue: TResult | undefined
    ) => TResult
  ): OutputSelector<TDependencies, TState, TGetters, TActionHelpers, TResult>;
}

export const createSelector: CreateSelector = (...args: any[]) => {
  const selectors: InputSelector[] = Array.isArray(args[0]) ? args[0] : [];
  const combiner: Function = args[args.length - 1];

  let defaultCache: SelectorCache | undefined;

  const outputSelector: OutputSelector = (context, cache) => {
    if (cache == null) {
      if (defaultCache == null) {
        defaultCache = {};
      }
      cache = defaultCache;
    }

    let shouldUpdate = cache.lastArgs == null;
    const lastArgs = cache.lastArgs ?? [];

    const currArgs: any[] = [];
    for (let i = 0; i < selectors.length; ++i) {
      currArgs.push(selectors[i](context, lastArgs[i]));
      if (!shouldUpdate && currArgs[i] !== lastArgs[i]) {
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      cache.lastArgs = currArgs;
      cache.lastResult = combiner(currArgs, context, cache.lastResult);
    }

    return cache.lastResult;
  };

  return outputSelector;
};

export function createGetters<TModel extends Model>(
  storeContext: StoreContext,
  container: ContainerImpl<TModel>
): ExtractGetters<ExtractSelectors<TModel>> {
  const getters: Getters = {};
  const cacheByPath = new Map<string, SelectorCache>();

  assignObjectDeeply(
    getters,
    container.model.selectors,
    (selector, paths, target) => {
      const fullPath = paths.join(".");

      Object.defineProperty(target, paths[paths.length - 1], {
        get() {
          let cache = cacheByPath.get(fullPath);
          if (cache == null) {
            cache = {};
            cacheByPath.set(fullPath, cache);
          }

          return selector(
            {
              rootAction$: storeContext.rootAction$,
              rootState$: storeContext.rootState$,

              dependencies: storeContext.getDependencies(),
              namespace: container.namespace,
              key: container.key,

              getState: () => container.getState(),
              getters: container.getters,
              actions: container.actions,

              getContainer: storeContext.getContainer,
            },
            cache
          );
        },
        enumerable: true,
        configurable: true,
      });
    }
  );

  return getters as any;
}
