import { Middleware } from "redux";
import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import {
  AnyAction,
  parseBatchRegisterPayloads,
  parseBatchUnregisterPayloads,
  RegisterPayload,
  UnregisterPayload
} from "./action";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { createReduxObservableEpic } from "./epic";
import { getSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, splitLastPart } from "./util";

export function createMiddleware(storeContext: StoreContext): Middleware {
  const rootActionSubject = new Subject<AnyAction>();
  const rootAction$ = rootActionSubject;

  const rootStateSubject = new Subject<any>();
  const rootState$ = rootStateSubject.pipe(distinctUntilChanged());

  function register(payloads: RegisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace!;
      const modelIndex = payload.model || 0;

      const { key, models } = storeContext.findModelsInfo(namespace)!;
      const model = models[modelIndex];

      const container = storeContext.getContainer(model, key!) as ContainerImpl;

      storeContext.containerById.set(container.id, container);
      storeContext.containerByNamespace.set(namespace, container);

      const epic = createReduxObservableEpic(storeContext, container);
      storeContext.addEpic$.next(epic);
    });
  }

  function unregister(payloads: UnregisterPayload[]) {
    payloads.forEach((payload) => {
      const namespace = payload.namespace!;

      const container = storeContext.containerByNamespace.get(namespace)!;
      container.clearCache();

      storeContext.containerByNamespace.delete(namespace);
    });
  }

  return (store) => (next) => (action: AnyAction) => {
    let container: ContainerImpl | undefined;

    const [namespace, actionName] = splitLastPart(action.type);
    const actionContext = storeContext.contextByAction.get(action);

    const batchRegisterPayloads = parseBatchRegisterPayloads(action);
    if (batchRegisterPayloads) {
      register(batchRegisterPayloads);
    }

    const batchUnregisterPayloads = parseBatchUnregisterPayloads(action);
    if (batchUnregisterPayloads) {
      unregister(batchUnregisterPayloads);
    }

    if (!batchRegisterPayloads && !batchUnregisterPayloads) {
      // try to auto register container
      if (actionContext && actionContext.container.canRegister) {
        actionContext.container.register();
      }

      // try to get container
      const modelsInfo = storeContext.findModelsInfo(namespace);
      if (modelsInfo != null) {
        const { baseNamespace, key, models } = modelsInfo;
        const basePath = convertNamespaceToPath(baseNamespace);

        const modelIndex = getSubState(
          (store.getState() || {})[stateModelsKey],
          basePath,
          key
        );
        if (modelIndex != null) {
          const model = models[modelIndex];
          container = storeContext.getContainer(model, key!) as ContainerImpl;
        }
      }
    }

    // dispatch action
    const result = next(action);

    // emit state and action
    rootStateSubject.next(store.getState());
    rootActionSubject.next(action);

    // handle effect
    let hasEffect = false;
    if (actionContext) {
      const deferred = actionContext.deferred;

      if (container && container.isRegistered) {
        const modelContext = storeContext.contextByModel.get(container.model)!;
        const effect = modelContext.effectByActionName.get(actionName);

        if (effect != null) {
          hasEffect = true;

          const promise = effect(
            {
              rootAction$,
              rootState$,

              dependencies: storeContext.options.dependencies,
              namespace: container.namespace,
              key: container.key,

              getState: () => container!.state,
              getters: container.getters,
              actions: container.actions,

              getContainer: storeContext.getContainer,
              dispatch: container.dispatch
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
        }
      }

      if (!hasEffect && deferred) {
        deferred.resolve(undefined);
      }
    }

    return result;
  };
}
