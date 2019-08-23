import { Middleware } from "redux";
import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import {
  AnyAction,
  batchRegisterActionHelper,
  batchUnregisterActionHelper,
  RegisterPayload,
  reloadActionHelper,
  ReloadPayload,
  UnregisterPayload
} from "./action";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { createReduxObservableEpic } from "./epic";
import { stateModelsKey } from "./state";
import { joinLastPart, splitLastPart } from "./util";

export function createMiddleware(storeContext: StoreContext): Middleware {
  const rootActionSubject = new Subject<AnyAction>();
  const rootAction$ = rootActionSubject;

  const rootStateSubject = new Subject<any>();
  const rootState$ = rootStateSubject.pipe(distinctUntilChanged());

  function register(payloads: RegisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace;
      const modelIndex = payload.model || 0;

      const { key, models } = storeContext.parseNamespace(namespace)!;
      const model = models[modelIndex];

      const container = storeContext.getContainer(model, key!) as ContainerImpl;

      storeContext.containerByNamespace.set(namespace, container);

      const epic = createReduxObservableEpic(storeContext, container);
      storeContext.addEpic$.next(epic);
    });
  }

  function unregister(payloads: UnregisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace;

      const container = storeContext.containerByNamespace.get(namespace)!;
      storeContext.contextByModel
        .get(container.model)!
        .containerByKey.delete(container.key);

      storeContext.containerByNamespace.delete(namespace);
    });
  }

  function reload(payload: ReloadPayload) {
    storeContext.containerByNamespace.clear();

    storeContext.contextByModel.forEach((context) => {
      context.containerByKey.clear();
    });

    storeContext.switchEpic$.next();

    const batchRegisterPayloads: RegisterPayload[] = [];

    const rootState =
      payload && payload.state !== undefined
        ? payload.state
        : storeContext.store.getState();
    if (rootState != null) {
      storeContext.contextByModel.forEach((context) => {
        const state = rootState[context.basePath];
        if (state != null) {
          if (!context.isDynamic) {
            batchRegisterPayloads.push({
              namespace: context.baseNamespace
            });
          } else {
            const models = state[stateModelsKey] || {};
            Object.keys(models).forEach((key) => {
              const modelIndex = models[key];
              if (typeof modelIndex === "number") {
                batchRegisterPayloads.push({
                  namespace: joinLastPart(context.baseNamespace, key),
                  model: modelIndex
                });
              }
            });
          }
        }
      });
    }

    register(batchRegisterPayloads);
  }

  return (store) => (next) => (action: AnyAction) => {
    if (batchRegisterActionHelper.is(action)) {
      register(action.payload);
    } else if (batchUnregisterActionHelper.is(action)) {
      unregister(action.payload);
    } else if (reloadActionHelper.is(action)) {
      reload(action.payload);
    }

    const result = next(action);

    rootStateSubject.next(store.getState());
    rootActionSubject.next(action);

    const [namespace, actionName] = splitLastPart(action.type);
    const container = storeContext.containerByNamespace.get(namespace);
    if (container && container.isRegistered) {
      const deferred = storeContext.deferredByAction.get(action);

      const modelContext = storeContext.contextByModel.get(container.model)!;
      const effect = modelContext.effectByActionName.get(actionName);

      if (effect != null) {
        const promise = effect(
          {
            rootAction$,
            rootState$,

            dependencies: storeContext.getDependencies(),
            namespace: container.namespace,
            key: container.key,

            getState: () => container!.getState(),
            getters: container.getters,
            actions: container.actions,

            getContainer: storeContext.getContainer
          },
          action.payload
        );

        promise.then(
          (value) => {
            if (deferred) {
              deferred.resolve(value);
            }
          },
          (reason) => {
            if (deferred) {
              deferred.reject(reason);
            } else if (storeContext.options.defaultEffectErrorHandler) {
              storeContext.options.defaultEffectErrorHandler(reason);
            } else {
              throw reason;
            }
          }
        );
      } else {
        if (deferred) {
          deferred.resolve(undefined);
        }
      }
    }

    return result;
  };
}
