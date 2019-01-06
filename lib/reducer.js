import produce from "immer";
import { actionTypes } from "./action";
import { getStoreCache } from "./cache";
import { convertNamespaceToPath, parseActionType } from "./util";
export function createReduxRootReducer(storeId) {
    const storeCache = getStoreCache(storeId);
    return (rootState, action) => {
        if (rootState === undefined) {
            rootState = {};
        }
        let initialRootState;
        storeCache.pendingNamespaces.forEach((_namespace) => {
            const _namespaceCache = storeCache.cacheByNamespace[_namespace];
            if (_namespaceCache == null) {
                return;
            }
            if (rootState[_namespaceCache.path] === undefined) {
                if (initialRootState == null) {
                    initialRootState = {};
                }
                initialRootState[_namespaceCache.path] = _namespaceCache.model.state({
                    dependencies: storeCache.dependencies,
                    props: _namespaceCache.props
                });
            }
        });
        storeCache.pendingNamespaces = [];
        if (initialRootState != null) {
            rootState = {
                ...rootState,
                ...initialRootState
            };
        }
        const actionType = "" + action.type;
        const { namespace, key } = parseActionType(actionType);
        if (key === actionTypes.unregister) {
            rootState = {
                ...rootState
            };
            delete rootState[convertNamespaceToPath(namespace)];
        }
        const namespaceCache = storeCache.cacheByNamespace[namespace];
        if (namespaceCache == null) {
            return rootState;
        }
        const reducer = namespaceCache.model.reducers[key];
        if (reducer == null) {
            return rootState;
        }
        return produce(rootState, (draft) => {
            reducer(draft[namespaceCache.path], action.payload, {
                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                originalState: rootState[namespaceCache.path]
            });
        });
    };
}
