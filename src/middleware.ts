import { Middleware } from "redux";
import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import {
  AnyAction,
  parseBatchRegisterPayloads,
  parseBatchUnregisterPayloads,
  RegisterPayload,
  reloadActionHelper,
  ReloadPayload,
  UnregisterPayload
} from "./action";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { createReduxObservableEpic } from "./epic";
import { getSubState, modelsStateKey } from "./state";
import {
  convertNamespaceToPath,
  convertPathToNamespace,
  mapObjectDeeply,
  splitLastPart
} from "./util";

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
      if (epic) {
        storeContext.addEpic$.next(epic);
      }
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

  function reload(payload: ReloadPayload) {
    storeContext.containerByNamespace.clear();
    storeContext.containerById.clear();
    storeContext.cacheById.clear();

    storeContext.switchEpic$.next();

    const batchRegisterPayloads: RegisterPayload[] = [];

    const rootState =
      payload && payload.state !== undefined
        ? payload.state
        : storeContext.store.getState();
    const modelsState = (rootState || {})[modelsStateKey] || {};
    mapObjectDeeply({}, modelsState, (modelIndex, paths) => {
      if (typeof modelIndex === "number") {
        const namespace = convertPathToNamespace(paths.join("."));
        batchRegisterPayloads.push({
          namespace,
          model: modelIndex
        });
      }
    });

    register(batchRegisterPayloads);
  }

  return (store) => (next) => (action: AnyAction) => {
    if (reloadActionHelper.is(action)) {
      reload(action.payload);
      return next(action);
    }

    let container: ContainerImpl | undefined;

    const [namespace, actionName] = splitLastPart(action.type);
    const actionContext = storeContext.contextByAction.get(action);
    storeContext.contextByAction.delete(action);

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
      if (
        actionContext &&
        actionContext.container.model.autoRegister &&
        actionContext.container.canRegister
      ) {
        actionContext.container.register();
      }

      // try to get container
      const modelsInfo = storeContext.findModelsInfo(namespace);
      if (modelsInfo != null) {
        const { baseNamespace, key, models } = modelsInfo;
        const basePath = convertNamespaceToPath(baseNamespace);

        const modelIndex = getSubState(
          (store.getState() || {})[modelsStateKey],
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
    if (actionContext) {
      const deferred = actionContext.deferred;

      if (container && container.isRegistered) {
        const modelContext = storeContext.contextByModel.get(container.model)!;
        const effect = modelContext.effectByActionName.get(actionName);

        if (effect != null) {
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

              dispatch: container.dispatch,
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
          deferred.resolve(undefined);
        }
      }
    }

    return result;
  };
}
