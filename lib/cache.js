import { ContainerImpl } from "./container";
import { buildNamespace } from "./util";
const cacheByStoreId = {};
export function getStoreCache(storeId) {
    if (cacheByStoreId[storeId] == null) {
        cacheByStoreId[storeId] = {
            store: undefined,
            options: undefined,
            dependencies: undefined,
            addEpic$: undefined,
            initialEpics: [],
            getState: (...args) => cacheByStoreId[storeId].store.getState(...args),
            dispatch: (...args) => cacheByStoreId[storeId].store.dispatch(...args),
            useContainer: (model, key) => {
                if (key == null) {
                    key = "";
                }
                const { cacheByNamespace, namespaceByModel } = cacheByStoreId[storeId];
                if (!namespaceByModel.has(model)) {
                    throw new Error("model is not registered yet");
                }
                const baseNamespace = namespaceByModel.get(model);
                const namespace = buildNamespace(baseNamespace, key);
                const namespaceCache = cacheByNamespace[namespace];
                if (namespaceCache == null || namespaceCache.model !== model) {
                    return new ContainerImpl(storeId, namespace, model);
                }
                else {
                    return namespaceCache.container;
                }
            },
            pendingNamespaces: [],
            effectDispatchHandlerByAction: new Map(),
            cacheByNamespace: {},
            namespaceByModel: new Map()
        };
    }
    return cacheByStoreId[storeId];
}
