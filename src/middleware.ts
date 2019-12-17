import { Middleware } from "redux";
import {
  AnyAction,
  registerActionHelper,
  RegisterOptions,
  reloadActionHelper,
  ReloadOptions,
  unregisterActionHelper,
  UnregisterOptions,
} from "./action";
import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { createReduxObservableEpic } from "./epic";
import { stateModelsKey } from "./state";
import { isObject, joinLastPart, splitLastPart } from "./util";

export function createMiddleware(storeContext: StoreContext): Middleware {
  function register(optionsList: RegisterOptions[]) {
    optionsList.forEach((options) => {
      const { baseNamespace, key, modelIndex } = options;

      const models = storeContext.modelsByBaseNamespace.get(baseNamespace);
      if (models == null) {
        throw new Error(
          `Failed to register container: no model found for namespace "${baseNamespace}"`
        );
      }

      const model = models[modelIndex ?? 0];
      const container = storeContext.getContainer(model, key!) as ContainerImpl;

      storeContext.containerByNamespace.set(container.namespace, container);

      const epic = createReduxObservableEpic(storeContext, container);
      storeContext.addEpic$.next(epic);
    });
  }

  function unregister(optionsList: UnregisterOptions[]) {
    optionsList.forEach((options) => {
      const { baseNamespace, key } = options;
      const namespace = joinLastPart(baseNamespace, key);

      const container = storeContext.containerByNamespace.get(namespace);
      if (container) {
        storeContext.contextByModel
          .get(container.model)
          ?.containerByKey.delete(container.key);
      }

      storeContext.containerByNamespace.delete(namespace);
    });
  }

  function reload(options: ReloadOptions) {
    storeContext.containerByNamespace.clear();

    storeContext.contextByModel.forEach((context) => {
      context.containerByKey.clear();
    });

    storeContext.switchEpic$.next();

    const rootState =
      options && options.state !== undefined
        ? options.state
        : storeContext.store.getState();

    const registerOptionsList: RegisterOptions[] = [];
    if (isObject(rootState)) {
      storeContext.contextByModel.forEach((context) => {
        const state = rootState[context.basePath];
        if (isObject(state)) {
          if (!context.isDynamic) {
            registerOptionsList.push({
              baseNamespace: context.baseNamespace,
            });
          } else {
            const models = state[stateModelsKey] || {};
            Object.keys(models).forEach((key) => {
              const modelIndex = models[key];
              if (typeof modelIndex === "number") {
                registerOptionsList.push({
                  baseNamespace: context.baseNamespace,
                  key,
                  modelIndex,
                });
              }
            });
          }
        }
      });
    }

    register(registerOptionsList);
  }

  return (store) => (next) => (action: AnyAction) => {
    if (registerActionHelper.is(action)) {
      register(action.payload);
    } else if (unregisterActionHelper.is(action)) {
      unregister(action.payload);
    } else if (reloadActionHelper.is(action)) {
      reload(action.payload);
    }

    const result = next(action);

    storeContext.rootStateSubject.next(store.getState());
    storeContext.rootActionSubject.next(action);

    const [namespace, actionName] = splitLastPart(action.type);
    const container = storeContext.containerByNamespace.get(namespace);
    if (container && container.isRegistered) {
      const deferred = storeContext.deferredByAction.get(action);

      const effect = storeContext.contextByModel
        .get(container.model)
        ?.effectByActionName.get(actionName);

      if (effect) {
        const promise = effect(container.effectContext, action.payload);

        promise.then(
          (value) => {
            deferred?.resolve(value);
          },
          (reason) => {
            if (deferred) {
              deferred.reject(reason);
            } else {
              storeContext.onUnhandledEffectError(reason);
            }
          }
        );
      } else {
        deferred?.resolve(undefined);
      }
    }

    return result;
  };
}
