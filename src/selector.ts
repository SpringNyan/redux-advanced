import {
  ActionHelpers,
  ConvertReducersAndEffectsToActionHelpers
} from "./action";
import { UseContainer } from "./container";
import { ExtractEffects } from "./effect";
import { ExtractDependencies, ExtractProps, Model } from "./model";
import { ExtractReducers } from "./reducer";

import { getStoreCache } from "./cache";
import { convertNamespaceToPath } from "./util";

export interface SelectorContext<
  TDependencies = any,
  TProps = any,
  TState = any,
  TGetters extends Getters = any,
  TActionHelpers extends ActionHelpers = any
> {
  dependencies: TDependencies;
  props: TProps;
  state: TState;
  getters: TGetters;
  actions: TActionHelpers;

  useContainer: UseContainer;
}

export type Selector<
  TDependencies = any,
  TProps = any,
  TState = any,
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
  TDependencies = any,
  TProps = any,
  TState = any,
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
    cacheId?: number
  ): TResult;

  __deleteCache?(cacheId: number): void;
}

export interface Selectors<
  TDependencies = any,
  TProps = any,
  TState = any,
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
  TDependencies = any,
  TProps = any,
  TState = any,
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

  const cacheById: {
    [id: number]: {
      cachedDependencies: any[] | undefined;
      cachedValue: any;
    };
  } = {};

  const resultSelector = (context: SelectorContext, cacheId: number) => {
    if (cacheById[cacheId] == null) {
      cacheById[cacheId] = {
        cachedDependencies: undefined,
        cachedValue: undefined
      };
    }
    const cache = cacheById[cacheId];

    let needUpdate = false;
    const dependencies = selectors.map((selector) => selector(context));
    if (
      cache.cachedDependencies == null ||
      dependencies.some(
        (dep, index) => dep !== cache.cachedDependencies![index]
      )
    ) {
      needUpdate = true;
    }

    if (needUpdate) {
      cache.cachedDependencies = dependencies;
      cache.cachedValue = combiner(...dependencies, context);
    }

    return cache.cachedValue;
  };
  resultSelector.__deleteCache = (cacheId: number) => {
    delete cacheById[cacheId];
  };

  return resultSelector;
}) as any;

export function createGetters<TModel extends Model>(
  storeId: number,
  namespace: string
): ConvertSelectorsToGetters<ExtractSelectors<TModel>> {
  const storeCache = getStoreCache(storeId);
  const namespaceCache = storeCache.cacheByNamespace[namespace];

  const getters: Getters = {};
  Object.keys(namespaceCache.model.selectors).forEach((key) => {
    Object.defineProperty(getters, key, {
      get() {
        const selector = namespaceCache.model.selectors[
          key
        ] as SelectorInternal;

        const rootState = storeCache.getState();
        const state = rootState[namespaceCache.path];

        return selector(
          {
            dependencies: storeCache.dependencies,
            props: namespaceCache.props,
            state,
            getters,
            actions: namespaceCache.container.actions,

            useContainer: storeCache.useContainer
          },
          namespaceCache.containerId
        );
      },
      enumerable: true,
      configurable: true
    });
  });

  return getters as any;
}
