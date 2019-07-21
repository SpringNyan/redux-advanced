import * as tslib_1 from "tslib";
import { joinLastPart, mapObjectDeeply, merge, PatchedPromise, splitLastPart } from "./util";
export var actionTypes = {
    register: "@@REGISTER",
    unregister: "@@UNREGISTER"
};
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
    ActionHelperImpl.prototype.dispatch = function (payload, dispatch) {
        var _this = this;
        var action = this.create(payload);
        var promise = new PatchedPromise(function (resolve, reject) {
            _this._storeContext.contextByAction.set(action, {
                container: _this._container,
                deferred: {
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
                }
            });
        });
        (dispatch || this._storeContext.store.dispatch)(action);
        return promise;
    };
    return ActionHelperImpl;
}());
export { ActionHelperImpl };
export function createActionHelpers(storeContext, container) {
    var actionHelpers = {};
    mapObjectDeeply(actionHelpers, merge({}, container.model.reducers, container.model.effects), function (obj, paths) {
        return new ActionHelperImpl(storeContext, container, joinLastPart(container.namespace, storeContext.options.resolveActionName(paths)));
    });
    return actionHelpers;
}
export var batchRegisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.register);
export var batchUnregisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.unregister);
export function parseBatchRegisterPayloads(action) {
    if (batchRegisterActionHelper.is(action)) {
        return action.payload || [];
    }
    var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
    if (actionName === actionTypes.register) {
        return [tslib_1.__assign({}, action.payload, { namespace: namespace })];
    }
    return null;
}
export function parseBatchUnregisterPayloads(action) {
    if (batchUnregisterActionHelper.is(action)) {
        return action.payload || [];
    }
    var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
    if (actionName === actionTypes.unregister) {
        return [tslib_1.__assign({}, action.payload, { namespace: namespace })];
    }
    return null;
}
export function createRegisterActionHelper(namespace) {
    return new ActionHelperImpl(undefined, undefined, joinLastPart(namespace, actionTypes.register));
}
export function createUnregisterActionHelper(namespace) {
    return new ActionHelperImpl(undefined, undefined, joinLastPart(namespace, actionTypes.unregister));
}
