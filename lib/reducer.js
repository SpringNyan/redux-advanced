import * as tslib_1 from "tslib";
import produce from "immer";
import { batchRegisterActionHelper, batchUnregisterActionHelper, reloadActionHelper } from "./action";
import { generateArgs, requiredArgFunc } from "./args";
import { getSubState, setSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, splitLastPart } from "./util";
export function createReduxReducer(storeContext) {
    function register(rootState, payloads) {
        payloads.forEach(function (payload) {
            var _a;
            var namespace = payload.namespace;
            var modelIndex = payload.model || 0;
            var _b = storeContext.parseNamespace(namespace), baseNamespace = _b.baseNamespace, key = _b.key, models = _b.models;
            var basePath = convertNamespaceToPath(baseNamespace);
            var model = models[modelIndex];
            var state;
            if (payload.state !== undefined) {
                state = payload.state;
            }
            else {
                var args = generateArgs(model, {
                    dependencies: storeContext.getDependencies(),
                    namespace: namespace,
                    key: key,
                    getContainer: storeContext.getContainer,
                    required: requiredArgFunc
                }, payload.args);
                state = model.state({
                    dependencies: storeContext.getDependencies(),
                    namespace: namespace,
                    key: key,
                    args: args,
                    getContainer: storeContext.getContainer
                });
            }
            rootState = setSubState(rootState, state, basePath, key);
            if (key !== undefined) {
                rootState = tslib_1.__assign({}, rootState, (_a = {}, _a[basePath] = setSubState(rootState[basePath], modelIndex, stateModelsKey, key), _a));
            }
        });
        return rootState;
    }
    function unregister(rootState, payloads) {
        payloads.forEach(function (payload) {
            var _a;
            var namespace = payload.namespace;
            var _b = storeContext.parseNamespace(namespace), baseNamespace = _b.baseNamespace, key = _b.key;
            var basePath = convertNamespaceToPath(baseNamespace);
            rootState = setSubState(rootState, undefined, basePath, key);
            if (key !== undefined) {
                rootState = tslib_1.__assign({}, rootState, (_a = {}, _a[basePath] = setSubState(rootState[basePath], undefined, stateModelsKey, key), _a));
            }
        });
        return rootState;
    }
    function reload(rootState, payload) {
        if (payload && payload.state !== undefined) {
            return payload.state;
        }
        else {
            return rootState;
        }
    }
    var reduxReducer = function (rootState, action) {
        if (reloadActionHelper.is(action)) {
            return reload(rootState, action.payload);
        }
        if (rootState === undefined) {
            rootState = {};
        }
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        if (batchRegisterActionHelper.is(action)) {
            rootState = register(rootState, action.payload);
        }
        else if (batchUnregisterActionHelper.is(action)) {
            rootState = unregister(rootState, action.payload);
        }
        var parsed = storeContext.parseNamespace(namespace);
        if (parsed == null) {
            return rootState;
        }
        var baseNamespace = parsed.baseNamespace, key = parsed.key, models = parsed.models;
        var basePath = convertNamespaceToPath(baseNamespace);
        var modelIndex = key !== undefined
            ? getSubState(rootState[basePath], stateModelsKey, key)
            : 0;
        if (typeof modelIndex !== "number") {
            return rootState;
        }
        var model = models[modelIndex];
        var modelContext = storeContext.contextByModel.get(model);
        if (modelContext == null) {
            return rootState;
        }
        var reducer = modelContext.reducerByActionName.get(actionName);
        if (reducer == null) {
            return rootState;
        }
        var state = getSubState(rootState, basePath, key);
        var newState = produce(state, function (draft) {
            reducer(draft, action.payload, {
                dependencies: storeContext.getDependencies(),
                namespace: namespace,
                key: key
            });
        });
        return setSubState(rootState, newState, basePath, key);
    };
    return function (rootState, action) {
        storeContext.adHocRootState = rootState;
        rootState = reduxReducer(rootState, action);
        storeContext.adHocRootState = undefined;
        return rootState;
    };
}
