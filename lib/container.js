import { createActionHelperDispatch, createActionHelpers, createRegisterActionHelper, createUnregisterActionHelper } from "./action";
import { createGetters } from "./selector";
import { getSubState } from "./state";
import { convertNamespaceToPath, joinLastPart, mapObjectDeeply, nil } from "./util";
var ContainerImpl = /** @class */ (function () {
    function ContainerImpl(_storeContext, model, key) {
        this._storeContext = _storeContext;
        this.model = model;
        this.key = key;
        var modelContext = this._storeContext.contextByModel.get(this.model);
        this.baseNamespace = modelContext.baseNamespace;
        this.id = modelContext.idByKey.get(this.key);
        this.namespace = joinLastPart(this.baseNamespace, this.key);
        this.basePath = convertNamespaceToPath(this.baseNamespace);
    }
    Object.defineProperty(ContainerImpl.prototype, "cache", {
        get: function () {
            var cache = this._storeContext.cacheById.get(this.id);
            if (cache == null) {
                cache = {
                    cachedArgs: undefined,
                    cachedState: nil,
                    cachedGetters: undefined,
                    cachedActions: undefined,
                    cachedDispatch: undefined
                };
                this._storeContext.cacheById.set(this.id, cache);
            }
            return cache;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._storeContext.containerByNamespace.get(this.namespace);
            return container != null && container.model === this.model;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            return !this._storeContext.containerByNamespace.has(this.namespace);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "state", {
        get: function () {
            if (this.isRegistered) {
                return getSubState(this._storeContext.store.getState(), this.basePath, this.key);
            }
            if (this.canRegister) {
                var cache = this.cache;
                if (cache.cachedState === nil) {
                    cache.cachedState = this.model.state({
                        dependencies: this._storeContext.options.dependencies,
                        namespace: this.namespace,
                        key: this.key,
                        args: cache.cachedArgs
                    });
                }
                return cache.cachedState;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedGetters === undefined) {
                    cache.cachedGetters = createGetters(this._storeContext, this);
                }
                return cache.cachedGetters;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedActions === undefined) {
                    cache.cachedActions = createActionHelpers(this._storeContext, this);
                }
                return cache.cachedActions;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "dispatch", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedDispatch === undefined) {
                    cache.cachedDispatch = createActionHelperDispatch(this._storeContext, this);
                }
                return cache.cachedDispatch;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (args) {
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        var cache = this.cache;
        cache.cachedArgs = args;
        cache.cachedState = nil;
        var models = this._storeContext.modelsByBaseNamespace.get(this.baseNamespace);
        var modelIndex = models.indexOf(this.model);
        this._storeContext.store.dispatch(createRegisterActionHelper(this.namespace).create({
            model: modelIndex,
            args: args
        }));
    };
    ContainerImpl.prototype.unregister = function () {
        if (this.isRegistered) {
            this._storeContext.store.dispatch(createUnregisterActionHelper(this.namespace).create({}));
        }
        else {
            this.clearCache();
        }
    };
    ContainerImpl.prototype.clearCache = function () {
        var _this = this;
        mapObjectDeeply({}, this.model.selectors, function (selector) {
            if (selector.__deleteCache) {
                selector.__deleteCache(_this.id);
            }
        });
        this._storeContext.containerById.delete(this.id);
        this._storeContext.cacheById.delete(this.id);
    };
    ContainerImpl.nextId = 1;
    return ContainerImpl;
}());
export { ContainerImpl };
export function createGetContainer(storeContext) {
    return function (model, key) {
        var modelContext = storeContext.contextByModel.get(model);
        if (modelContext == null) {
            throw new Error("model is not registered yet");
        }
        if (key === undefined && modelContext.isDynamic) {
            throw new Error("key should be provided for dynamic model");
        }
        if (key !== undefined && !modelContext.isDynamic) {
            throw new Error("key should not be provided for static model");
        }
        var id = modelContext.idByKey.get(key);
        if (id == null) {
            id = ContainerImpl.nextId;
            ContainerImpl.nextId += 1;
            modelContext.idByKey.set(key, id);
        }
        var container = storeContext.containerById.get(id);
        if (container == null) {
            container = new ContainerImpl(storeContext, model, key);
            storeContext.containerById.set(id, container);
        }
        return container;
    };
}
