import { ContainerImpl } from "./container";
import { buildNamespace } from "./util";
export function createStoreCache() {
    const storeCache = {
        store: undefined,
        options: undefined,
        dependencies: undefined,
        addEpic$: undefined,
        initialEpics: [],
        getState: (...args) => storeCache.store.getState(...args),
        dispatch: (...args) => storeCache.store.dispatch(...args),
        useContainer: (model, key) => {
            if (key == null) {
                key = "";
            }
            const { cacheByNamespace, namespaceByModel } = storeCache;
            if (!namespaceByModel.has(model)) {
                throw new Error("model is not registered yet");
            }
            const baseNamespace = namespaceByModel.get(model);
            const namespace = buildNamespace(baseNamespace, key);
            const namespaceCache = cacheByNamespace[namespace];
            if (namespaceCache == null || namespaceCache.model !== model) {
                return new ContainerImpl(storeCache, namespace, model);
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
    return storeCache;
}
