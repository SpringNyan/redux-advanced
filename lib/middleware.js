import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { parseBatchRegisterPayloads, parseBatchUnregisterPayloads, reloadActionHelper } from "./action";
import { createReduxObservableEpic } from "./epic";
import { getSubState, modelsStateKey } from "./state";
import { convertNamespaceToPath, convertPathToNamespace, mapObjectDeeply, splitLastPart } from "./util";
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
    function reload(payload) {
        storeContext.containerByNamespace.clear();
        storeContext.containerById.clear();
        storeContext.cacheById.clear();
        storeContext.switchEpic$.next();
        var batchRegisterPayloads = [];
        var rootState = payload && payload.state !== undefined
            ? payload.state
            : storeContext.store.getState();
        var modelsState = (rootState || {})[modelsStateKey] || {};
        mapObjectDeeply({}, modelsState, function (modelIndex, paths) {
            if (typeof modelIndex === "number") {
                var namespace = convertPathToNamespace(paths.join("."));
                batchRegisterPayloads.push({
                    namespace: namespace,
                    model: modelIndex
                });
            }
        });
        register(batchRegisterPayloads);
    }
    return function (store) { return function (next) { return function (action) {
        if (reloadActionHelper.is(action)) {
            reload(action.payload);
            return next(action);
        }
        var container;
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var actionContext = storeContext.contextByAction.get(action);
        storeContext.contextByAction.delete(action);
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
            if (actionContext &&
                actionContext.container.model.autoRegister &&
                actionContext.container.canRegister) {
                actionContext.container.register();
            }
            // try to get container
            var modelsInfo = storeContext.findModelsInfo(namespace);
            if (modelsInfo != null) {
                var baseNamespace = modelsInfo.baseNamespace, key = modelsInfo.key, models = modelsInfo.models;
                var basePath = convertNamespaceToPath(baseNamespace);
                var modelIndex = getSubState((store.getState() || {})[modelsStateKey], basePath, key);
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
        if (actionContext) {
            var deferred_1 = actionContext.deferred;
            if (container && container.isRegistered) {
                var modelContext = storeContext.contextByModel.get(container.model);
                var effect = modelContext.effectByActionName.get(actionName);
                if (effect != null) {
                    var promise = effect({
                        rootAction$: rootAction$,
                        rootState$: rootState$,
                        dependencies: storeContext.options.dependencies,
                        namespace: container.namespace,
                        key: container.key,
                        getState: function () { return container.state; },
                        getters: container.getters,
                        actions: container.actions,
                        dispatch: container.dispatch,
                        getContainer: storeContext.getContainer
                    }, action.payload);
                    promise.then(function (value) {
                        if (deferred_1) {
                            deferred_1.resolve(value);
                        }
                    }, function (reason) {
                        if (deferred_1) {
                            deferred_1.reject(reason);
                        }
                        else if (storeContext.options.defaultEffectErrorHandler) {
                            storeContext.options.defaultEffectErrorHandler(reason);
                        }
                        else {
                            throw reason;
                        }
                    });
                }
                else {
                    deferred_1.resolve(undefined);
                }
            }
        }
        return result;
    }; }; };
}
