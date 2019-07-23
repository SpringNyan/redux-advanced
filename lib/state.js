import * as tslib_1 from "tslib";
export var modelsStateKey = "__models";
export function getSubState(rootState, basePath, key) {
    if (rootState == null) {
        return undefined;
    }
    var state = rootState[basePath];
    if (key === undefined) {
        return state;
    }
    if (state == null) {
        return undefined;
    }
    state = state[key];
    return state;
}
export function setSubState(rootState, value, basePath, key) {
    var _a;
    if (rootState == null) {
        rootState = {};
    }
    if (key === undefined) {
        if (rootState[basePath] === value) {
            return rootState;
        }
        rootState = tslib_1.__assign({}, rootState);
        if (value === undefined) {
            delete rootState[basePath];
        }
        else {
            rootState[basePath] = value;
        }
        return rootState;
    }
    else {
        var state = setSubState(rootState[basePath], value, key, undefined);
        if (rootState[basePath] === state) {
            return rootState;
        }
        return tslib_1.__assign({}, rootState, (_a = {}, _a[basePath] = state, _a));
    }
}
