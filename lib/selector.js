import { mapObjectDeeply } from "./util";
export var createSelector = (function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var arrayMode = Array.isArray(args[0]);
    var selectors = arrayMode
        ? args[0]
        : args.slice(0, args.length - 1);
    // tslint:disable-next-line:ban-types
    var combiner = args[args.length - 1];
    var resultSelector = function (context, cache) {
        var needUpdate = cache.lastParams == null;
        var lastParams = cache.lastParams || [];
        var params = [];
        // tslint:disable-next-line:prefer-for-of
        for (var i = 0; i < selectors.length; ++i) {
            var selector = selectors[i];
            params.push(selector(context, lastParams[i]));
            if (!needUpdate && params[i] !== lastParams[i]) {
                needUpdate = true;
            }
        }
        if (needUpdate) {
            cache.lastParams = params;
            cache.lastResult = arrayMode
                ? combiner(params, context)
                : combiner.apply(void 0, params.concat([context]));
        }
        return cache.lastResult;
    };
    return resultSelector;
});
export function createGetters(storeContext, container) {
    var getters = {};
    mapObjectDeeply(getters, container.model.selectors, function (selector, paths, target) {
        var fullPath = paths.join(".");
        Object.defineProperty(target, paths[paths.length - 1], {
            get: function () {
                var selectorCacheByPath = container.cache.selectorCacheByPath;
                var cache = selectorCacheByPath.get(fullPath);
                if (cache == null) {
                    cache = {};
                    selectorCacheByPath.set(fullPath, cache);
                }
                return selector({
                    dependencies: storeContext.options.dependencies,
                    namespace: container.namespace,
                    key: container.key,
                    state: container.state,
                    getters: container.getters,
                    actions: container.actions,
                    getContainer: storeContext.getContainer
                }, cache);
            },
            enumerable: true,
            configurable: true
        });
    });
    return getters;
}
