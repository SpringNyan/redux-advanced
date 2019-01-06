export const actionTypes = {
    register: "@@REGISTER",
    epicEnd: "@@EPIC_END",
    unregister: "@@UNREGISTER"
};
export class ActionHelperImpl {
    constructor(_storeCache, type) {
        this._storeCache = _storeCache;
        this.type = type;
    }
    is(action) {
        return action != null && action.type === this.type;
    }
    create(payload) {
        return {
            type: this.type,
            payload
        };
    }
    dispatch(payload, dispatch) {
        const action = this.create(payload);
        if (dispatch == null) {
            dispatch = this._storeCache.dispatch;
        }
        const promise = new Promise((resolve, reject) => {
            this._storeCache.effectDispatchHandlerByAction.set(action, {
                hasEffect: false,
                resolve: () => {
                    resolve();
                    this._storeCache.effectDispatchHandlerByAction.delete(action);
                },
                reject: (err) => {
                    reject(err);
                    this._storeCache.effectDispatchHandlerByAction.delete(action);
                }
            });
        });
        dispatch(action);
        Promise.resolve().then(() => {
            const handler = this._storeCache.effectDispatchHandlerByAction.get(action);
            if (handler != null && !handler.hasEffect) {
                handler.resolve();
            }
        });
        return promise;
    }
}
export function createActionHelpers(storeCache, namespace) {
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    const actionHelpers = {};
    [
        ...Object.keys(namespaceCache.model.reducers),
        ...Object.keys(namespaceCache.model.effects)
    ].forEach((key) => {
        if (actionHelpers[key] == null) {
            actionHelpers[key] = new ActionHelperImpl(storeCache, `${namespace}/${key}`);
        }
    });
    return actionHelpers;
}
