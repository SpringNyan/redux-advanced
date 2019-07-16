import * as tslib_1 from "tslib";
import produce from "immer";
import { parseBatchRegisterPayloads, parseBatchUnregisterPayloads } from "./action";
import { getSubState, setSubState, stateModelsKey } from "./state";
import { convertNamespaceToPath, splitLastPart } from "./util";
export function createReduxReducer(storeContext) {
    function register(rootState, payloads) {
        payloads.forEach(function (payload) {
            var _a;
            var namespace = payload.namespace;
            var modelIndex = payload.model || 0;
            var args = payload.args;
            var state = payload.state;
            var _b = storeContext.findModelsInfo(namespace), baseNamespace = _b.baseNamespace, key = _b.key, models = _b.models;
            var basePath = convertNamespaceToPath(baseNamespace);
            var model = models[modelIndex];
            rootState = tslib_1.__assign({}, rootState, (_a = {}, _a[stateModelsKey] = setSubState(rootState[stateModelsKey], modelIndex, basePath, key), _a));
            if (state !== undefined) {
                rootState = setSubState(rootState, state, basePath, key);
            }
            else {
                var modelState = model.state({
                    dependencies: storeContext.options.dependencies,
                    namespace: namespace,
                    key: key,
                    args: args
                });
                rootState = setSubState(rootState, modelState, basePath, key);
            }
        });
        return rootState;
    }
    function unregister(rootState, payloads) {
        payloads.forEach(function (payload) {
            var _a;
            var namespace = payload.namespace;
            var _b = storeContext.findModelsInfo(namespace), baseNamespace = _b.baseNamespace, key = _b.key;
            var basePath = convertNamespaceToPath(baseNamespace);
            rootState = tslib_1.__assign({}, rootState, (_a = {}, _a[stateModelsKey] = setSubState(rootState[stateModelsKey], undefined, basePath, key), _a));
            rootState = setSubState(rootState, undefined, basePath, key);
        });
        return rootState;
    }
    return function (rootState, action) {
        if (rootState === undefined) {
            rootState = {};
        }
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var batchRegisterPayloads = parseBatchRegisterPayloads(action);
        if (batchRegisterPayloads) {
            rootState = register(rootState, batchRegisterPayloads);
        }
        var batchUnregisterPayloads = parseBatchUnregisterPayloads(action);
        if (batchUnregisterPayloads) {
            rootState = unregister(rootState, batchUnregisterPayloads);
        }
        var modelsInfo = storeContext.findModelsInfo(namespace);
        if (modelsInfo == null) {
            return rootState;
        }
        var baseNamespace = modelsInfo.baseNamespace, key = modelsInfo.key, models = modelsInfo.models;
        var basePath = convertNamespaceToPath(baseNamespace);
        var modelIndex = getSubState(rootState[stateModelsKey], basePath, key);
        if (modelIndex == null) {
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
                dependencies: storeContext.options.dependencies,
                namespace: namespace,
                key: key,
                originalState: state
            });
        });
        return setSubState(rootState, newState, basePath, key);
    };
}
