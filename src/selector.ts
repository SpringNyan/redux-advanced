import { ActionHelpers } from "./action";
import { StoreCache } from "./cache";
import { GetContainer } from "./container";
import { Model } from "./model";
import { DeepPartial } from "./util";

import { ContainerImpl } from "./container";
import { flattenFunctionObject } from "./util";

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
  [name: string]:
    | Selector<TDependencies, TProps, TState, TGetters, TActionHelpers>
    | Selectors<TDependencies, TProps, TState, TGetters, TActionHelpers>;
}

export type SelectorsFactory<
  TDependencies extends object | undefined,
  TProps extends object | undefined,
  TState extends object | undefined,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers,
  TSelectors extends DeepPartial<
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
  [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any
    ? ExtractSelectorResult<TSelectors[P]>
    : TSelectors[P] extends {}
    ? ConvertSelectorsToGetters<TSelectors[P]>
    : never
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
  TDependencies extends object | undefined,
  TProps extends object | undefined,
  TState extends object | undefined,
  TGetters extends Getters,
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TSelectors]: TSelectors[P] extends (...args: any[]) => any
    ? Selector<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers,
        ExtractSelectorResult<TSelectors[P]>
      >
    : OverrideSelectors<
        TSelectors[P],
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
};

export interface CreateSelector<
  TDependencies extends object | undefined = any,
  TProps extends object | undefined = any,
  TState extends object | undefined = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  <
    T extends
      | Array<
          Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, any>
        >
      | [
          Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, any>
        ],
    TResult
  >(
    selectors: T,
    combiner: (
      results: {
        [P in keyof T]: T[P] extends Selector<
          TDependencies,
          TProps,
          TState,
          TGetters,
          TActionHelpers,
          any
        >
          ? ReturnType<T[P]>
          : never
      },
      context: SelectorContext<
        TDependencies,
        TProps,
        TState,
        TGetters,
        TActionHelpers
      >
    ) => TResult
  ): Selector<TDependencies, TProps, TState, TGetters, TActionHelpers, TResult>;
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

export const createSelector: CreateSelector = ((...args: any[]) => {
  const arrayMode = Array.isArray(args[0]);

  const selectors: Selector[] = arrayMode
    ? args[0]
    : args.slice(0, args.length - 1);

  // tslint:disable-next-line:ban-types
  const combiner: Function = args[args.length - 1];

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
      cache.lastResult = arrayMode
        ? combiner(params, context)
        : combiner(...params, context);
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

  flattenFunctionObject<SelectorInternal>(container.model.selectors).forEach(
    ({ paths, value }) => {
      let obj = getters;
      paths.forEach((path, index) => {
        if (index === paths.length - 1) {
          Object.defineProperty(obj, path, {
            get() {
              return value(
                {
                  dependencies: storeCache.dependencies,
                  namespace: container.namespace,
                  key: container.key,

                  state: container.state,
                  getters: container.getters,
                  actions: container.actions,

                  getContainer: storeCache.getContainer
                },
                container.id
              );
            },
            enumerable: true,
            configurable: true
          });
        } else {
          if (obj[path] == null) {
            obj[path] = {};
          }
          obj = obj[path] as Getters;
        }
      });
    }
  );

  return getters as any;
}
