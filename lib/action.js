import { joinLastPart, mapObjectDeeply, merge, PatchedPromise } from "./util";
var ActionHelperImpl = /** @class */ (function () {
    function ActionHelperImpl(_storeContext, _container, type) {
        this._storeContext = _storeContext;
        this._container = _container;
        this.type = type;
    }
    ActionHelperImpl.prototype.is = function (action) {
        return action != null && action.type === this.type;
    };
    ActionHelperImpl.prototype.create = function (payload) {
        return {
            type: this.type,
            payload: payload
        };
    };
    ActionHelperImpl.prototype.dispatch = function (payload) {
        var _this = this;
        if (this._container.canRegister &&
            this._container.model.options.autoRegister) {
            this._container.register();
        }
        var action = this.create(payload);
        var promise = new PatchedPromise(function (resolve, reject) {
            _this._storeContext.deferredByAction.set(action, {
                resolve: resolve,
                reject: function (reason) {
                    reject(reason);
                    Promise.resolve().then(function () {
                        if (!promise.hasRejectionHandler &&
                            _this._storeContext.options.defaultEffectErrorHandler) {
                            promise.catch(_this._storeContext.options.defaultEffectErrorHandler);
                        }
                    });
                }
            });
        });
        this._storeContext.store.dispatch(action);
        return promise;
    };
    return ActionHelperImpl;
}());
export { ActionHelperImpl };
export function createActionHelpers(storeContext, container) {
    var actionHelpers = {};
    mapObjectDeeply(actionHelpers, merge({}, container.model.reducers, container.model.effects), function (obj, paths) {
        return new ActionHelperImpl(storeContext, container, joinLastPart(container.namespace, storeContext.resolveActionName(paths)));
    });
    return actionHelpers;
}
export var actionTypes = {
    register: "@@REGISTER",
    unregister: "@@UNREGISTER",
    reload: "@@RELOAD"
};
export var batchRegisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.register);
export var batchUnregisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.unregister);
export var reloadActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.reload);
