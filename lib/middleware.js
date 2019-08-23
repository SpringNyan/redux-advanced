import { Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { batchRegisterActionHelper, batchUnregisterActionHelper, reloadActionHelper } from "./action";
import { createReduxObservableEpic } from "./epic";
import { stateModelsKey } from "./state";
import { joinLastPart, splitLastPart } from "./util";
export function createMiddleware(storeContext) {
    var rootActionSubject = new Subject();
    var rootAction$ = rootActionSubject;
    var rootStateSubject = new Subject();
    var rootState$ = rootStateSubject.pipe(distinctUntilChanged());
    function register(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var modelIndex = payload.model || 0;
            var _a = storeContext.parseNamespace(namespace), key = _a.key, models = _a.models;
            var model = models[modelIndex];
            var container = storeContext.getContainer(model, key);
            storeContext.containerByNamespace.set(namespace, container);
            var epic = createReduxObservableEpic(storeContext, container);
            storeContext.addEpic$.next(epic);
        });
    }
    function unregister(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var container = storeContext.containerByNamespace.get(namespace);
            storeContext.contextByModel
                .get(container.model)
                .containerByKey.delete(container.key);
            storeContext.containerByNamespace.delete(namespace);
        });
    }
    function reload(payload) {
        storeContext.containerByNamespace.clear();
        storeContext.contextByModel.forEach(function (context) {
            context.containerByKey.clear();
        });
        storeContext.switchEpic$.next();
        var batchRegisterPayloads = [];
        var rootState = payload && payload.state !== undefined
            ? payload.state
            : storeContext.store.getState();
        if (rootState != null) {
            storeContext.contextByModel.forEach(function (context) {
                var state = rootState[context.basePath];
                if (state != null) {
                    if (!context.isDynamic) {
                        batchRegisterPayloads.push({
                            namespace: context.baseNamespace
                        });
                    }
                    else {
                        var models_1 = state[stateModelsKey] || {};
                        Object.keys(models_1).forEach(function (key) {
                            var modelIndex = models_1[key];
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
    return function (store) { return function (next) { return function (action) {
        if (batchRegisterActionHelper.is(action)) {
            register(action.payload);
        }
        else if (batchUnregisterActionHelper.is(action)) {
            unregister(action.payload);
        }
        else if (reloadActionHelper.is(action)) {
            reload(action.payload);
        }
        var result = next(action);
        rootStateSubject.next(store.getState());
        rootActionSubject.next(action);
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var container = storeContext.containerByNamespace.get(namespace);
        if (container && container.isRegistered) {
            var deferred_1 = storeContext.deferredByAction.get(action);
            var modelContext = storeContext.contextByModel.get(container.model);
            var effect = modelContext.effectByActionName.get(actionName);
            if (effect != null) {
                var promise = effect({
                    rootAction$: rootAction$,
                    rootState$: rootState$,
                    dependencies: storeContext.getDependencies(),
                    namespace: container.namespace,
                    key: container.key,
                    getState: function () { return container.getState(); },
                    getters: container.getters,
                    actions: container.actions,
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
                if (deferred_1) {
                    deferred_1.resolve(undefined);
                }
            }
        }
        return result;
    }; }; };
}
