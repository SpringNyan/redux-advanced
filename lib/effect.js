export function createEffectDispatch(storeContext, container) {
    var dispatch = function (action) {
        if (effectDispatch === container.cache.cachedDispatch) {
            storeContext.store.dispatch(action);
        }
        else {
            throw new Error("container is already unregistered");
        }
        return action;
    };
    var effectDispatch = function (arg1, arg2) {
        var actionHelper = arg1;
        if (actionHelper && typeof actionHelper.dispatch === "function") {
            return actionHelper.dispatch(arg2, dispatch);
        }
        else {
            return dispatch(arg1);
        }
    };
    return effectDispatch;
}
