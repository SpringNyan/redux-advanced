import { batchRegisterActionHelper, batchUnregisterActionHelper, createActionHelpers } from "./action";
import { generateArgs, requiredArgFunc } from "./args";
import { createGetters } from "./selector";
import { getSubState } from "./state";
import { joinLastPart } from "./util";
var ContainerImpl = /** @class */ (function () {
    function ContainerImpl(_storeContext, model, key) {
        this._storeContext = _storeContext;
        this.model = model;
        this.key = key;
        this._getStateCache = {
            rootState: {},
            value: undefined
        };
        this._modelContext = this._storeContext.contextByModel.get(this.model);
        this.namespace = joinLastPart(this._modelContext.baseNamespace, this.key);
    }
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.isRegistered;
            }
            var registeredContainer = this._storeContext.containerByNamespace.get(this.namespace);
            return (registeredContainer != null && registeredContainer.model === this.model);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.canRegister;
            }
            return !this._storeContext.containerByNamespace.has(this.namespace);
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.getRootState = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.getRootState();
        }
        return this._storeContext.adHocRootState !== undefined
            ? this._storeContext.adHocRootState
            : this._storeContext.store.getState();
    };
    ContainerImpl.prototype.getState = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.getState();
        }
        if (this.isRegistered) {
            var rootState = this.getRootState();
            if (this._getStateCache.rootState === rootState) {
                return this._getStateCache.value;
            }
            var value = getSubState(rootState, this._modelContext.basePath, this.key);
            this._getStateCache.rootState = rootState;
            this._getStateCache.value = value;
            return value;
        }
        if (this.canRegister) {
            if (this._cachedState === undefined) {
                var args = generateArgs(this.model, {
                    dependencies: this._storeContext.getDependencies(),
                    namespace: this.namespace,
                    key: this.key,
                    getContainer: this._storeContext.getContainer,
                    required: requiredArgFunc
                }, this._cachedArgs, true);
                this._cachedState = this.model.state({
                    dependencies: this._storeContext.getDependencies(),
                    namespace: this.namespace,
                    key: this.key,
                    args: args,
                    getContainer: this._storeContext.getContainer
                });
            }
            return this._cachedState;
        }
        throw new Error("namespace is already registered by other model");
    };
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.getters;
            }
            if (this.isRegistered || this.canRegister) {
                if (this._cachedGetters === undefined) {
                    this._cachedGetters = createGetters(this._storeContext, this);
                }
                return this._cachedGetters;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.actions;
            }
            if (this.isRegistered || this.canRegister) {
                if (this._cachedActions === undefined) {
                    this._cachedActions = createActionHelpers(this._storeContext, this);
                }
                return this._cachedActions;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (args) {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.register(args);
        }
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        this._cachedArgs = args;
        this._cachedState = undefined;
        this._storeContext.store.dispatch(batchRegisterActionHelper.create([
            {
                namespace: this.namespace,
                model: this._modelContext.modelIndex,
                args: args
            }
        ]));
    };
    ContainerImpl.prototype.unregister = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.unregister();
        }
        if (this.isRegistered) {
            this._storeContext.store.dispatch(batchUnregisterActionHelper.create([
                {
                    namespace: this.namespace
                }
            ]));
        }
    };
    ContainerImpl.prototype._getCurrentContainer = function () {
        return this._storeContext.getContainer(this.model, this.key);
    };
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
        var container = modelContext.containerByKey.get(key);
        if (container == null) {
            container = new ContainerImpl(storeContext, model, key);
            modelContext.containerByKey.set(key, container);
        }
        return container;
    };
}
