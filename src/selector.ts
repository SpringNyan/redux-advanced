import { ActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { GetContainer } from "./container";
import { Model } from "./model";

import { ContainerImpl } from "./container";

export interface SelectorContext<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  dependencies: TDependencies;
  namespace: string;
  key: string;

  state: TState;
  getters: TGetters;
  actions: TActionHelpers;

  getContainer: GetContainer;
}

export type Selector<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> = (
  context: SelectorContext<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >
) => TResult;

export interface SelectorInternal<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any,
  TResult = any
> {
  (
    context: SelectorContext<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers
    >,
    cacheKey?: string
  ): TResult;

  __deleteCache?(cacheKey: string): void;
}

export interface Selectors<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  [name: string]: Selector<
    TDependencies,
    TProps,
    TState,
    TGetters,
    TActionHelpers
  >;
}

export type SelectorsFactory<
  TDependencies extends object | undefined,
  TProps extends object | undefined,
  TState extends object | undefined,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers,
  TSelectors extends Partial<
    Selectors<TDependencies, TProps, TState, TGetters, TActionHelpers>
  >
> = (
  createSelector: CreateSelector<
    TDependencies,
    TProps,
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
  any,
  infer TResult
>
  ? TResult
  : never;

export type ConvertSelectorsToGetters<TSelectors extends Selectors> = {
  [P in keyof TSelectors]: ExtractSelectorResult<TSelectors[P]>
};

export type ExtractSelectors<T extends Model> = T extends Model<
  any,
  any,
  any,
  infer TSelectors,
  any,
  any
>
  ? TSelectors
  : never;

export interface CreateSelector<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  <T1, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    combiner: (
      res1: T1,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    combiner: (
      res1: T1,
      res2: T2,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, T5, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    selector5: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T5
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      res5: T5,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, T5, T6, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    selector5: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T5
    >,
    selector6: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T6
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      res5: T5,
      res6: T6,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, T5, T6, T7, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    selector5: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T5
    >,
    selector6: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T6
    >,
    selector7: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T7
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      res5: T5,
      res6: T6,
      res7: T7,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, T5, T6, T7, T8, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    selector5: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T5
    >,
    selector6: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T6
    >,
    selector7: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T7
    >,
    selector8: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T8
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      res5: T5,
      res6: T6,
      res7: T7,
      res8: T8,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, TResult>(
    selector1: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T1
    >,
    selector2: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T2
    >,
    selector3: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T3
    >,
    selector4: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T4
    >,
    selector5: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T5
    >,
    selector6: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T6
    >,
    selector7: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T7
    >,
    selector8: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T8
    >,
    selector9: Selector<
      TDependencies,
      TProps,
      TState,
      TGetters,
      TActionHelpers,
      T9
    >,
    combiner: (
      res1: T1,
      res2: T2,
      res3: T3,
      res4: T4,
      res5: T5,
      res6: T6,
      res7: T7,
      res8: T8,
      res9: T9,
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
}

// tslint:disable-next-line:ban-types
export const createSelector: CreateSelector = ((...args: Function[]) => {
  const selectors = args.slice(0, args.length - 1);
  const combiner = args[args.length - 1];

  const cacheByKey: Map<
    string,
    { lastParams: any[] | undefined; lastResult: any }
  > = new Map();

  const resultSelector = (context: SelectorContext, cacheKey: string) => {
    if (cacheKey == null) {
      cacheKey = "";
    }

    let cache = cacheByKey.get(cacheKey);
    if (cache == null) {
      cache = {
        lastParams: undefined,
        lastResult: undefined
      };
      cacheByKey.set(cacheKey, cache);
    }

    let needUpdate = cache.lastParams == null;

    const params: any[] = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < selectors.length; ++i) {
      const selector = selectors[i];
      params.push(selector(context));

      if (!needUpdate && params[i] !== cache.lastParams![i]) {
        needUpdate = true;
      }
    }

    if (needUpdate) {
      cache.lastParams = params;
      cache.lastResult = combiner(...params, context);
    }

    return cache.lastResult;
  };
  resultSelector.__deleteCache = (cacheKey: string) => {
    cacheByKey.delete(cacheKey);
  };

  return resultSelector;
}) as any;

export function createGetters<TModel extends Model>(
  storeCache: StoreCache,
  container: ContainerImpl<TModel>
): ConvertSelectorsToGetters<ExtractSelectors<TModel>> {
  const getters: Getters = {};
  Object.keys(container.model.selectors).forEach((key) => {
    Object.defineProperty(getters, key, {
      get() {
        const selector = container.model.selectors[key] as SelectorInternal;

        return selector(
          {
            dependencies: storeCache.dependencies,
            namespace: container.namespace,
            key: container.key,

            state: container.state,
            getters,
            actions: container.actions,

            getContainer: storeCache.getContainer
          },
          container.id
        );
      },
      enumerable: true,
      configurable: true
    });
  });

  return getters as any;
}
