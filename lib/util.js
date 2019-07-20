export var nil = "__nil_" + Date.now();
export function factoryWrapper(obj) {
    return typeof obj === "function" ? obj : function () { return obj; };
}
export function isObject(obj) {
    return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
export function mapObjectDeeply(target, source, func, paths) {
    if (paths === void 0) { paths = []; }
    Object.keys(source).forEach(function (key) {
        if (key === "constructor" || key === "prototype" || key === "__proto__") {
            throw new Error("illegal object key");
        }
        var value = source[key];
        if (isObject(value)) {
            var nextTarget = target[key];
            if (nextTarget === undefined) {
                nextTarget = {};
                target[key] = nextTarget;
            }
            if (!isObject(nextTarget)) {
                throw new Error("only object can be merged");
            }
            mapObjectDeeply(nextTarget, value, func, paths.concat([key]));
        }
        else {
            var result = func(value, paths.concat([key]), target);
            if (result !== undefined) {
                target[key] = result;
            }
        }
    });
    return target;
}
export function merge(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    sources.forEach(function (source) {
        if (isObject(source)) {
            mapObjectDeeply(target, source, function (value) { return value; });
        }
    });
    return target;
}
export function convertNamespaceToPath(namespace) {
    return namespace.replace(/\//g, ".");
}
export function joinLastPart(str, lastPart, splitter) {
    if (splitter === void 0) { splitter = "/"; }
    if (!lastPart) {
        return str;
    }
    if (!str) {
        return lastPart;
    }
    return "" + str + splitter + lastPart;
}
export function splitLastPart(str, splitter) {
    if (splitter === void 0) { splitter = "/"; }
    var index = str.lastIndexOf(splitter);
    return index >= 0
        ? [str.substring(0, index), str.substring(index + 1)]
        : ["", str];
}
var PatchedPromise = /** @class */ (function () {
    function PatchedPromise(executor) {
        this.hasRejectionHandler = false;
        this._promise = new Promise(executor);
    }
    PatchedPromise.prototype.then = function (onfulfilled, onrejected) {
        if (onrejected) {
            this.hasRejectionHandler = true;
        }
        return this._promise.then(onfulfilled, onrejected);
    };
    PatchedPromise.prototype.catch = function (onrejected) {
        if (onrejected) {
            this.hasRejectionHandler = true;
        }
        return this._promise.catch(onrejected);
    };
    PatchedPromise.prototype.finally = function (onfinally) {
        return this._promise.finally(onfinally);
    };
    return PatchedPromise;
}());
export { PatchedPromise };
