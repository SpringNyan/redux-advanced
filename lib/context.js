import { Subject } from "rxjs";
import { createGetContainer } from "./container";
import { splitLastPart } from "./util";
export function createStoreContext() {
    var storeContext = {
        store: undefined,
        options: undefined,
        getContainer: undefined,
        addEpic$: new Subject(),
        contextByModel: new Map(),
        modelsByBaseNamespace: new Map(),
        containerByNamespace: new Map(),
        containerById: new Map(),
        cacheById: new Map(),
        contextByAction: new WeakMap(),
        findModelsInfo: function (namespace) {
            var _a;
            var baseNamespace = namespace;
            var key;
            var models = storeContext.modelsByBaseNamespace.get(namespace);
            if (models == null) {
                _a = splitLastPart(namespace), baseNamespace = _a[0], key = _a[1];
                models = storeContext.modelsByBaseNamespace.get(baseNamespace);
            }
            if (models == null) {
                return null;
            }
            return {
                baseNamespace: baseNamespace,
                key: key,
                models: models
            };
        }
    };
    storeContext.getContainer = createGetContainer(storeContext);
    return storeContext;
}