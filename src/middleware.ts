import { Middleware } from "redux";
import { Subject } from "rxjs";

import { AnyAction } from "./action";
import { StoreCache } from "./cache";
import { Effect } from "./effect";
import { Model } from "./model";

import { ContainerImpl } from "./container";
import { parseActionType } from "./util";

export function createMiddleware(storeCache: StoreCache): Middleware {
  const rootAction$ = new Subject<AnyAction>();

  return () => (next) => (action) => {
    const context = storeCache.contextByAction.get(action);

    // handle auto register model
    if (context != null && context.model.autoRegister) {
      const container = storeCache.getContainer(context.model, context.key);
      if (container.canRegister) {
        container.register();
      }
    }

    const result = next(action);

    // TODO: use result?
    rootAction$.next(action);

    // handle effect
    if (context != null && context.effectDeferred != null) {
      const { namespace, key } = parseActionType("" + action.type);

      const container = storeCache.getContainer(
        context.model,
        context.key
      ) as ContainerImpl<Model>;

      if (container.isRegistered) {
        const effect = container.model.effects[key] as Effect;
        if (effect != null) {
          const promise = effect(
            {
              rootAction$,

              namespace,

              dependencies: storeCache.dependencies,
              props: container.props,
              key: container.key,

              getState: () => container.state,
              getters: container.getters,
              actions: container.actions,

              getContainer: storeCache.getContainer
            },
            action.payload
          );

          promise.then(
            (value) => {
              context.effectDeferred!.resolve(value);
            },
            (reason) => {
              context.effectDeferred!.reject(reason);
            }
          );

          if (storeCache.options.effectErrorHandler != null) {
            promise.catch((reason) =>
              storeCache.options.effectErrorHandler!(reason)
            );
          }
        } else {
          context.effectDeferred!.resolve(undefined);
        }
      } else {
        context.effectDeferred!.resolve(undefined);
      }
    }

    return result;
  };
}
