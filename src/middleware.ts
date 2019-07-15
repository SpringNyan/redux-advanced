import { Middleware } from "redux";
import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import {
  Action,
  actionTypes,
  AnyAction,
  RegisterPayload,
  UnregisterPayload
} from "./action";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { createReduxObservableEpic } from "./epic";
import { getSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, joinLastPart, splitLastPart } from "./util";

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

      const container = storeContext.getContainer(model, key) as ContainerImpl;

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

  return (store) => (next) => (action: Action) => {
    let container: ContainerImpl | undefined;

    const [namespace, actionName] = splitLastPart(action.type);

    // try to get container
    if (
      actionName !== actionTypes.register &&
      actionName !== actionTypes.unregistered
    ) {
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
          container = storeContext.getContainer(model, key) as ContainerImpl;
        }
      }
    }

    // auto register container
    if (container && container.canRegister) {
      container.register();
    }

    // dispatch action
    const result = next(action);

    // emit state and action
    rootStateSubject.next(store.getState());
    rootActionSubject.next(action);

    // handle effect
    let hasEffect = false;
    const deferred = storeContext.deferredByAction.get(action);
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
            } else if (storeContext.options.catchEffectError) {
              storeContext.options.catchEffectError(reason);
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

    // handle register/unregister
    if (action.type === actionTypes.register) {
      register(action.payload || []);
      store.dispatch({
        type: actionTypes.registered,
        payload: action.payload
      });
    } else if (actionName === actionTypes.register) {
      register([{ ...action.payload, namespace }]);
      store.dispatch({
        type: joinLastPart(namespace, actionTypes.registered),
        payload: action.payload
      });
    }

    if (action.type === actionTypes.unregister) {
      unregister(action.payload || []);
      store.dispatch({
        type: actionTypes.unregistered,
        payload: action.payload
      });
    } else if (actionName === actionTypes.unregister) {
      unregister([{ ...action.payload, namespace }]);
      store.dispatch({
        type: joinLastPart(namespace, actionTypes.unregistered),
        payload: action.payload
      });
    }

    return result;
  };
}
