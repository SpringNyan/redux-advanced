import { getStoreCache } from "./cache";
// tslint:disable-next-line:ban-types
export const createSelector = ((...args) => {
    const selectors = args.slice(0, args.length - 1);
    const combiner = args[args.length - 1];
    const cacheById = {};
    const resultSelector = (context, cacheId) => {
        if (cacheId == null) {
            cacheId = 0;
        }
        if (cacheById[cacheId] == null) {
            cacheById[cacheId] = {
                cachedDependencies: undefined,
                cachedValue: undefined
            };
        }
        const cache = cacheById[cacheId];
        let needUpdate = false;
        const dependencies = selectors.map((selector) => selector(context));
        if (cache.cachedDependencies == null ||
            dependencies.some((dep, index) => dep !== cache.cachedDependencies[index])) {
            needUpdate = true;
        }
        if (needUpdate) {
            cache.cachedDependencies = dependencies;
            cache.cachedValue = combiner(...dependencies, context);
        }
        return cache.cachedValue;
    };
    resultSelector.__deleteCache = (cacheId) => {
        delete cacheById[cacheId];
    };
    return resultSelector;
});
export function createGetters(storeId, namespace) {
    const storeCache = getStoreCache(storeId);
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    const getters = {};
    Object.keys(namespaceCache.model.selectors).forEach((key) => {
        Object.defineProperty(getters, key, {
            get() {
                const selector = namespaceCache.model.selectors[key];
                const rootState = storeCache.getState();
                const state = rootState[namespaceCache.path];
                return selector({
                    dependencies: storeCache.dependencies,
                    props: namespaceCache.props,
                    state,
                    getters,
                    actions: namespaceCache.container.actions,
                    useContainer: storeCache.useContainer
                }, namespaceCache.containerId);
            },
            enumerable: true,
            configurable: true
        });
    });
    return getters;
}
