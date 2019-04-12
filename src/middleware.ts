import { Middleware } from "redux";
import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import { AnyAction } from "./action";
import { StoreCache } from "./cache";
import { Model } from "./model";

import { ContainerImpl } from "./container";
import { parseActionType } from "./util";

export function createMiddleware(storeCache: StoreCache): Middleware {
  const rootActionSubject = new Subject<AnyAction>();
  const rootAction$ = rootActionSubject;

  const rootStateSubject = new Subject<unknown>();
  const rootState$ = rootStateSubject.pipe(distinctUntilChanged());

  return (store) => (next) => (action) => {
    const context = storeCache.contextByAction.get(action);

    // handle auto register model
    if (context != null && context.model.autoRegister) {
      const container = storeCache.getContainer(context.model, context.key);
      if (container.canRegister) {
        container.register();
      }
    }

    const result = next(action);

    rootStateSubject.next(store.getState());
    rootActionSubject.next(action);

    // handle effect
    if (context != null && context.effectDeferred != null) {
      const { namespace, actionName } = parseActionType(action.type);

      const container = storeCache.getContainer(
        context.model,
        context.key
      ) as ContainerImpl<Model>;

      if (container.isRegistered) {
        const modelContext = storeCache.contextByModel.get(container.model);
        const effect = modelContext
          ? modelContext.effectByActionName[actionName]
          : null;

        if (effect != null) {
          const promise = effect(
            {
              rootAction$,
              rootState$,

              dependencies: storeCache.dependencies,
              namespace,
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
