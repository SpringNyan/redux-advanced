import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { parseBatchRegisterPayloads, parseBatchUnregisterPayloads } from "./action";
import { createReduxObservableEpic } from "./epic";
import { getSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, splitLastPart } from "./util";
export function createMiddleware(storeContext) {
    var rootActionSubject = new Subject();
    var rootAction$ = rootActionSubject;
    var rootStateSubject = new Subject();
    var rootState$ = rootStateSubject.pipe(distinctUntilChanged());
    function register(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var modelIndex = payload.model || 0;
            var _a = storeContext.findModelsInfo(namespace), key = _a.key, models = _a.models;
            var model = models[modelIndex];
            var container = storeContext.getContainer(model, key);
            storeContext.containerById.set(container.id, container);
            storeContext.containerByNamespace.set(namespace, container);
            var epic = createReduxObservableEpic(storeContext, container);
            storeContext.addEpic$.next(epic);
        });
    }
    function unregister(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var container = storeContext.containerByNamespace.get(namespace);
            container.clearCache();
            storeContext.containerByNamespace.delete(namespace);
        });
    }
    return function (store) { return function (next) { return function (action) {
        var container;
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var actionContext = storeContext.contextByAction.get(action);
        var batchRegisterPayloads = parseBatchRegisterPayloads(action);
        if (batchRegisterPayloads) {
            register(batchRegisterPayloads);
        }
        var batchUnregisterPayloads = parseBatchUnregisterPayloads(action);
        if (batchUnregisterPayloads) {
            unregister(batchUnregisterPayloads);
        }
        if (!batchRegisterPayloads && !batchUnregisterPayloads) {
            // try to auto register container
            if (actionContext && actionContext.container.canRegister) {
                actionContext.container.register();
            }
            // try to get container
            var modelsInfo = storeContext.findModelsInfo(namespace);
            if (modelsInfo != null) {
                var baseNamespace = modelsInfo.baseNamespace, key = modelsInfo.key, models = modelsInfo.models;
                var basePath = convertNamespaceToPath(baseNamespace);
                var modelIndex = getSubState((store.getState() || {})[stateModelsKey], basePath, key);
                if (modelIndex != null) {
                    var model = models[modelIndex];
                    container = storeContext.getContainer(model, key);
                }
            }
        }
        // dispatch action
        var result = next(action);
        // emit state and action
        rootStateSubject.next(store.getState());
        rootActionSubject.next(action);
        // handle effect
        var hasEffect = false;
        if (actionContext) {
            var deferred_1 = actionContext.deferred;
            if (container && container.isRegistered) {
                var modelContext = storeContext.contextByModel.get(container.model);
                var effect = modelContext.effectByActionName.get(actionName);
                if (effect != null) {
                    hasEffect = true;
                    var promise = effect({
                        rootAction$: rootAction$,
                        rootState$: rootState$,
                        dependencies: storeContext.options.dependencies,
                        namespace: container.namespace,
                        key: container.key,
                        getState: function () { return container.state; },
                        getters: container.getters,
                        actions: container.actions,
                        getContainer: storeContext.getContainer,
                        dispatch: container.dispatch
                    }, action.payload);
                    promise.then(function (value) {
                        if (deferred_1) {
                            deferred_1.resolve(value);
                        }
                    }, function (reason) {
                        if (deferred_1) {
                            deferred_1.reject(reason);
                        }
                        else if (storeContext.options.catchEffectError) {
                            storeContext.options.catchEffectError(reason);
                        }
                        else {
                            throw reason;
                        }
                    });
                }
            }
            if (!hasEffect && deferred_1) {
                deferred_1.resolve(undefined);
            }
        }
        return result;
    }; }; };
}
