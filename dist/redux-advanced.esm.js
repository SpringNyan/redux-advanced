import { createStore, applyMiddleware } from 'redux';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import { merge as merge$1, Subject, BehaviorSubject } from 'rxjs';
import { catchError, takeUntil, distinctUntilChanged, mergeMap } from 'rxjs/operators';
import produce from 'immer';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var umd = createCommonjsModule(function (module, exports) {
(function (global, factory) {
	module.exports = factory();
}(commonjsGlobal, (function () {var isMergeableObject = function isMergeableObject(value) {
	return isNonNullObject(value)
		&& !isSpecial(value)
};
function isNonNullObject(value) {
	return !!value && typeof value === 'object'
}
function isSpecial(value) {
	var stringValue = Object.prototype.toString.call(value);
	return stringValue === '[object RegExp]'
		|| stringValue === '[object Date]'
		|| isReactElement(value)
}
var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;
function isReactElement(value) {
	return value.$$typeof === REACT_ELEMENT_TYPE
}
function emptyTarget(val) {
	return Array.isArray(val) ? [] : {}
}
function cloneUnlessOtherwiseSpecified(value, options) {
	return (options.clone !== false && options.isMergeableObject(value))
		? deepmerge(emptyTarget(value), value, options)
		: value
}
function defaultArrayMerge(target, source, options) {
	return target.concat(source).map(function(element) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}
function getMergeFunction(key, options) {
	if (!options.customMerge) {
		return deepmerge
	}
	var customMerge = options.customMerge(key);
	return typeof customMerge === 'function' ? customMerge : deepmerge
}
function mergeObject(target, source, options) {
	var destination = {};
	if (options.isMergeableObject(target)) {
		Object.keys(target).forEach(function(key) {
			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
		});
	}
	Object.keys(source).forEach(function(key) {
		if (!options.isMergeableObject(source[key]) || !target[key]) {
			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
		} else {
			destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
		}
	});
	return destination
}
function deepmerge(target, source, options) {
	options = options || {};
	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
	options.isMergeableObject = options.isMergeableObject || isMergeableObject;
	var sourceIsArray = Array.isArray(source);
	var targetIsArray = Array.isArray(target);
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}
deepmerge.all = function deepmergeAll(array, options) {
	if (!Array.isArray(array)) {
		throw new Error('first argument should be an array')
	}
	return array.reduce(function(prev, next) {
		return deepmerge(prev, next, options)
	}, {})
};
var deepmerge_1 = deepmerge;
return deepmerge_1;
})));
});

var nil = {};
function merge() {
    var objs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objs[_i] = arguments[_i];
    }
    objs = objs.map(function (obj) { return (obj != null ? obj : {}); });
    return umd.all(objs);
}
var namespaceSplitterRegExp = new RegExp("/", "g");
function convertNamespaceToPath(namespace) {
    return namespace.replace(namespaceSplitterRegExp, ".");
}
function parseActionType(type) {
    var lastSplitterIndex = type.lastIndexOf("/");
    var namespace = type.substring(0, lastSplitterIndex);
    var actionName = type.substring(lastSplitterIndex + 1);
    return { namespace: namespace, actionName: actionName };
}
function buildNamespace(baseNamespace, key) {
    if (key == null || key === "") {
        return baseNamespace;
    }
    if (baseNamespace === "") {
        return key;
    }
    return baseNamespace + "/" + key;
}
function functionWrapper(obj) {
    return typeof obj === "function" ? obj : function () { return obj; };
}
function flattenFunctionObject(obj, paths) {
    if (paths === void 0) { paths = []; }
    var result = [];
    Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        if (value != null && typeof value === "object") {
            result.push.apply(result, flattenFunctionObject(value, paths.concat([key])));
        }
        else if (typeof value === "function") {
            result.push({
                paths: paths.concat([key]),
                value: value
            });
        }
    });
    return result;
}
var PatchedPromise =  (function () {
    function PatchedPromise(executor) {
        this.rejectionHandled = false;
        this._promise = new Promise(executor);
    }
    PatchedPromise.prototype.then = function (onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, this._patchOnRejected(onrejected));
    };
    PatchedPromise.prototype.catch = function (onrejected) {
        return this._promise.catch(this._patchOnRejected(onrejected));
    };
    PatchedPromise.prototype.finally = function (onfinally) {
        return this._promise.finally(onfinally);
    };
    PatchedPromise.prototype._patchOnRejected = function (onrejected) {
        var _this = this;
        return onrejected != null
            ? function (reason) {
                _this.rejectionHandled = true;
                return onrejected(reason);
            }
            : onrejected;
    };
    return PatchedPromise;
}());

var actionTypes = {
    register: "@@REGISTER",
    epicEnd: "@@EPIC_END",
    unregister: "@@UNREGISTER"
};
var ActionHelperImpl =  (function () {
    function ActionHelperImpl(_storeCache, _container, _actionName) {
        var _this = this;
        this._storeCache = _storeCache;
        this._container = _container;
        this._actionName = _actionName;
        this.is = function (action) {
            return action != null && action.type === _this.type;
        };
        this.create = function (payload) {
            var action = {
                type: _this.type,
                payload: payload
            };
            _this._storeCache.contextByAction.set(action, {
                model: _this._container.model,
                key: _this._container.key
            });
            return action;
        };
        this.dispatch = function (payload, dispatch) {
            var action = _this.create(payload);
            if (dispatch == null) {
                dispatch = _this._storeCache.dispatch;
            }
            var promise = new PatchedPromise(function (resolve, reject) {
                var context = _this._storeCache.contextByAction.get(action);
                if (context != null) {
                    context.effectDeferred = {
                        resolve: resolve,
                        reject: function (reason) {
                            setTimeout(function () {
                                if (!promise.rejectionHandled &&
                                    _this._storeCache.options.effectErrorHandler != null) {
                                    _this._storeCache.options.effectErrorHandler(reason);
                                }
                            }, 0);
                            return reject(reason);
                        }
                    };
                }
            });
            dispatch(action);
            return promise;
        };
        this.type = this._container.namespace + "/" + this._actionName;
    }
    return ActionHelperImpl;
}());
function createActionHelpers(storeCache, container) {
    var actionHelpers = {};
    flattenFunctionObject(
    merge({}, container.model.reducers, container.model.effects)).forEach(function (_a) {
        var paths = _a.paths;
        var obj = actionHelpers;
        paths.forEach(function (path, index) {
            if (index === paths.length - 1) {
                obj[path] = new ActionHelperImpl(storeCache, container, storeCache.options.resolveActionName(paths));
            }
            else {
                if (obj[path] == null) {
                    obj[path] = {};
                }
                obj = obj[path];
            }
        });
    });
    return actionHelpers;
}

var createSelector = (function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var arrayMode = Array.isArray(args[0]);
    var selectors = arrayMode
        ? args[0]
        : args.slice(0, args.length - 1);
    var combiner = args[args.length - 1];
    var cacheByKey = new Map();
    var resultSelector = function (context, cacheKey) {
        if (cacheKey == null) {
            cacheKey = "";
        }
        var cache = cacheByKey.get(cacheKey);
        if (cache == null) {
            cache = {
                lastParams: undefined,
                lastResult: undefined
            };
            cacheByKey.set(cacheKey, cache);
        }
        var needUpdate = cache.lastParams == null;
        var params = [];
        for (var i = 0; i < selectors.length; ++i) {
            var selector = selectors[i];
            params.push(selector(context));
            if (!needUpdate && params[i] !== cache.lastParams[i]) {
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
    resultSelector.__deleteCache = function (cacheKey) {
        cacheByKey.delete(cacheKey);
    };
    return resultSelector;
});
function createGetters(storeCache, container) {
    var getters = {};
    flattenFunctionObject(container.model.selectors).forEach(function (_a) {
        var paths = _a.paths, value = _a.value;
        var obj = getters;
        paths.forEach(function (path, index) {
            if (index === paths.length - 1) {
                Object.defineProperty(obj, path, {
                    get: function () {
                        return value({
                            dependencies: storeCache.dependencies,
                            namespace: container.namespace,
                            key: container.key,
                            state: container.state,
                            getters: container.getters,
                            actions: container.actions,
                            getContainer: storeCache.getContainer
                        }, container.id);
                    },
                    enumerable: true,
                    configurable: true
                });
            }
            else {
                if (obj[path] == null) {
                    obj[path] = {};
                }
                obj = obj[path];
            }
        });
    });
    return getters;
}

var ModelBuilder =  (function () {
    function ModelBuilder(model) {
        this._isFrozen = false;
        this._model = cloneModel(model);
    }
    ModelBuilder.prototype.freeze = function () {
        this._isFrozen = true;
        return this;
    };
    ModelBuilder.prototype.clone = function () {
        return new ModelBuilder(this._model);
    };
    ModelBuilder.prototype.extend = function (model) {
        if (this._isFrozen) {
            return this.clone().extend(model);
        }
        this.dependencies()
            .props(model.defaultProps)
            .state(model.state)
            .selectors(model.selectors)
            .reducers(model.reducers)
            .effects(model.effects)
            .epics(model.epics);
        return this;
    };
    ModelBuilder.prototype.dependencies = function () {
        if (this._isFrozen) {
            return this.clone().dependencies();
        }
        return this;
    };
    ModelBuilder.prototype.props = function (props) {
        if (this._isFrozen) {
            return this.clone().props(props);
        }
        var oldPropsFn = this._model.defaultProps;
        var newPropsFn = functionWrapper(props);
        this._model.defaultProps = function (context) {
            var oldProps = oldPropsFn(context);
            var newProps = newPropsFn(context);
            if (oldProps === undefined && newProps === undefined) {
                return undefined;
            }
            return merge({}, oldProps, newProps);
        };
        return this;
    };
    ModelBuilder.prototype.overrideProps = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideProps(override);
        }
        var oldPropsFn = this._model.defaultProps;
        this._model.defaultProps = function (context) {
            var oldProps = oldPropsFn(context);
            var newProps = functionWrapper(override(oldProps))(context);
            if (oldProps === undefined && newProps === undefined) {
                return undefined;
            }
            return merge({}, oldProps, newProps);
        };
        return this;
    };
    ModelBuilder.prototype.state = function (state) {
        if (this._isFrozen) {
            return this.clone().state(state);
        }
        var oldStateFn = this._model.state;
        var newStateFn = functionWrapper(state);
        this._model.state = function (context) {
            var oldState = oldStateFn(context);
            var newState = newStateFn(context);
            if (oldState === undefined && newState === undefined) {
                return undefined;
            }
            return merge({}, oldState, newState);
        };
        return this;
    };
    ModelBuilder.prototype.overrideState = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideState(override);
        }
        var oldStateFn = this._model.state;
        this._model.state = function (context) {
            var oldState = oldStateFn(context);
            var newState = functionWrapper(override(oldState))(context);
            if (oldState === undefined && newState === undefined) {
                return undefined;
            }
            return merge({}, oldState, newState);
        };
        return this;
    };
    ModelBuilder.prototype.selectors = function (selectors) {
        if (this._isFrozen) {
            return this.clone().selectors(selectors);
        }
        if (typeof selectors === "function") {
            selectors = selectors(createSelector);
        }
        this._model.selectors = merge({}, this._model.selectors, selectors);
        return this;
    };
    ModelBuilder.prototype.overrideSelectors = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideSelectors(override);
        }
        var selectors = override(this._model.selectors);
        if (typeof selectors === "function") {
            selectors = selectors(createSelector);
        }
        this._model.selectors = merge({}, this._model.selectors, selectors);
        return this;
    };
    ModelBuilder.prototype.reducers = function (reducers) {
        if (this._isFrozen) {
            return this.clone().reducers(reducers);
        }
        this._model.reducers = merge({}, this._model.reducers, reducers);
        return this;
    };
    ModelBuilder.prototype.overrideReducers = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideReducers(override);
        }
        this._model.reducers = merge({}, this._model.reducers, override(this._model.reducers));
        return this;
    };
    ModelBuilder.prototype.effects = function (effects) {
        if (this._isFrozen) {
            return this.clone().effects(effects);
        }
        this._model.effects = merge({}, this._model.effects, effects);
        return this;
    };
    ModelBuilder.prototype.overrideEffects = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideEffects(override);
        }
        this._model.effects = merge({}, this._model.effects, override(this._model.effects));
        return this;
    };
    ModelBuilder.prototype.epics = function (epics) {
        if (this._isFrozen) {
            return this.clone().epics(epics);
        }
        this._model.epics = merge({}, this._model.epics, epics);
        return this;
    };
    ModelBuilder.prototype.overrideEpics = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideEpics(override);
        }
        this._model.epics = merge({}, this._model.epics, override(this._model.epics));
        return this;
    };
    ModelBuilder.prototype.autoRegister = function (value) {
        if (value === void 0) { value = true; }
        if (this._isFrozen) {
            return this.clone().autoRegister(value);
        }
        this._model.autoRegister = value;
        return this;
    };
    ModelBuilder.prototype.build = function (props) {
        var model = cloneModel(this._model);
        if (props !== undefined) {
            model.defaultProps = functionWrapper(props);
        }
        return model;
    };
    return ModelBuilder;
}());
function cloneModel(model) {
    return {
        defaultProps: model.defaultProps,
        autoRegister: model.autoRegister,
        state: model.state,
        selectors: merge({}, model.selectors),
        reducers: merge({}, model.reducers),
        effects: merge({}, model.effects),
        epics: merge({}, model.epics)
    };
}
function isModel(obj) {
    var model = obj;
    return (model != null &&
        model.defaultProps != null &&
        model.autoRegister != null &&
        model.state != null &&
        model.selectors != null &&
        model.reducers != null &&
        model.effects != null &&
        model.epics != null &&
        typeof model.defaultProps === "function" &&
        typeof model.autoRegister === "boolean" &&
        typeof model.state === "function");
}
function createModelBuilder() {
    return new ModelBuilder({
        defaultProps: function () { return undefined; },
        autoRegister: false,
        state: function () { return undefined; },
        selectors: {},
        reducers: {},
        effects: {},
        epics: {}
    });
}
function registerModel(storeCache, namespace, model) {
    var models = Array.isArray(model) ? model : [model];
    models.forEach(function (_model) {
        if (storeCache.contextByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        var reducerByActionName = {};
        flattenFunctionObject(_model.reducers).forEach(function (_a) {
            var paths = _a.paths, value = _a.value;
            var actionName = storeCache.options.resolveActionName(paths);
            if (reducerByActionName[actionName] != null) {
                throw new Error("action name of reducer should be unique");
            }
            reducerByActionName[actionName] = value;
        });
        var effectByActionName = {};
        flattenFunctionObject(_model.effects).forEach(function (_a) {
            var paths = _a.paths, value = _a.value;
            var actionName = storeCache.options.resolveActionName(paths);
            if (effectByActionName[actionName] != null) {
                throw new Error("action name of effect should be unique");
            }
            effectByActionName[actionName] = value;
        });
        storeCache.contextByModel.set(_model, {
            baseNamespace: namespace,
            cacheIdByKey: new Map(),
            reducerByActionName: reducerByActionName,
            effectByActionName: effectByActionName
        });
    });
}
function registerModels(storeCache, namespace, models) {
    Object.keys(models).forEach(function (key) {
        var model = models[key];
        var modelNamespace = buildNamespace(namespace, key);
        if (Array.isArray(model)) {
            registerModel(storeCache, modelNamespace, model);
        }
        else if (isModel(model)) {
            registerModel(storeCache, modelNamespace, model);
            storeCache.getContainer(model).register();
        }
        else {
            registerModels(storeCache, modelNamespace, model);
        }
    });
}

function createEpicsReduxObservableEpic(storeCache, container) {
    return function (rootAction$, rootState$) {
        var outputObservables = flattenFunctionObject(container.model.epics).map(function (_a) {
            var epic = _a.value;
            var output$ = epic({
                rootAction$: rootAction$,
                rootState$: rootState$,
                dependencies: storeCache.dependencies,
                namespace: container.namespace,
                key: container.key,
                getState: function () { return container.state; },
                getters: container.getters,
                actions: container.actions,
                getContainer: storeCache.getContainer
            });
            if (storeCache.options.epicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
            }
            return output$;
        });
        var takeUntil$ = rootAction$.ofType(container.namespace + "/" + actionTypes.unregister);
        return merge$1.apply(void 0, outputObservables).pipe(takeUntil(takeUntil$));
    };
}

var ContainerImpl =  (function () {
    function ContainerImpl(_storeCache, model, key) {
        this._storeCache = _storeCache;
        this.model = model;
        this.key = key;
        var modelContext = this._storeCache.contextByModel.get(this.model);
        var baseNamespace = modelContext.baseNamespace;
        this.id = modelContext.cacheIdByKey.get(this.key);
        this.namespace = buildNamespace(baseNamespace, this.key);
        this.path = convertNamespaceToPath(this.namespace);
    }
    Object.defineProperty(ContainerImpl.prototype, "_cache", {
        get: function () {
            var cache = this._storeCache.cacheById.get(this.id);
            if (cache == null) {
                cache = {
                    props: this._createProps(),
                    cachedState: nil,
                    cachedGetters: undefined,
                    cachedActions: undefined
                };
                this._storeCache.cacheById.set(this.id, cache);
            }
            return cache;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._storeCache.containerByNamespace.get(this.namespace);
            return container != null && container.model === this.model;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            return !this._storeCache.containerByNamespace.has(this.namespace);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "props", {
        get: function () {
            return this._cache.props;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "state", {
        get: function () {
            if (this.isRegistered) {
                return this._storeCache.getState()[this.path];
            }
            if (this.canRegister) {
                var cache = this._cache;
                if (cache.cachedState === nil) {
                    cache.cachedState = this.model.state({
                        dependencies: this._storeCache.dependencies,
                        props: cache.props,
                        key: this.key
                    });
                }
                return cache.cachedState;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this._cache;
                if (cache.cachedGetters === undefined) {
                    cache.cachedGetters = createGetters(this._storeCache, this);
                }
                return cache.cachedGetters;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this._cache;
                if (cache.cachedActions === undefined) {
                    cache.cachedActions = createActionHelpers(this._storeCache, this);
                }
                return cache.cachedActions;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (props) {
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        this._storeCache.containerById.set(this.id, this);
        var cache = this._cache;
        cache.props = this._createProps(props);
        this._storeCache.containerByNamespace.set(this.namespace, this);
        this._storeCache.initStateNamespaces.push(this.namespace);
        var epic = createEpicsReduxObservableEpic(this._storeCache, this);
        if (this._storeCache.store != null) {
            this._storeCache.addEpic$.next(epic);
            this._storeCache.dispatch({
                type: this.namespace + "/" + actionTypes.register
            });
        }
        else {
            this._storeCache.initialEpics.push(epic);
        }
    };
    ContainerImpl.prototype.unregister = function () {
        if (this.isRegistered) {
            this._storeCache.dispatch({
                type: this.namespace + "/" + actionTypes.epicEnd
            });
            this._storeCache.containerByNamespace.delete(this.namespace);
            this._storeCache.dispatch({
                type: this.namespace + "/" + actionTypes.unregister
            });
        }
        this._clearCache();
    };
    ContainerImpl.prototype._createProps = function (props) {
        if (props === undefined) {
            props = this.model.defaultProps;
        }
        return functionWrapper(props)({
            dependencies: this._storeCache.dependencies,
            key: this.key
        });
    };
    ContainerImpl.prototype._clearCache = function () {
        var _this = this;
        Object.keys(this.model.selectors).forEach(function (key) {
            var selector = _this.model.selectors[key];
            if (selector.__deleteCache != null) {
                selector.__deleteCache(_this.id);
            }
        });
        this._storeCache.containerById.delete(this.id);
        this._storeCache.cacheById.delete(this.id);
    };
    return ContainerImpl;
}());
function createGetContainer(storeCache) {
    return function (model, key) {
        var modelContext = storeCache.contextByModel.get(model);
        if (modelContext == null) {
            throw new Error("model is not registered yet");
        }
        if (key == null) {
            key = "";
        }
        var cacheId = modelContext.cacheIdByKey.get(key);
        if (cacheId == null) {
            cacheId = "" + storeCache.nextCacheId;
            storeCache.nextCacheId += 1;
            modelContext.cacheIdByKey.set(key, cacheId);
        }
        var container = storeCache.containerById.get(cacheId);
        if (container == null) {
            container = new ContainerImpl(storeCache, model, key);
            storeCache.containerById.set(cacheId, container);
        }
        return container;
    };
}

function createStoreCache() {
    var storeCache = {
        store: undefined,
        options: undefined,
        dependencies: undefined,
        addEpic$: undefined,
        initialEpics: [],
        getState: function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = storeCache.store).getState.apply(_a, args);
        },
        dispatch: function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = storeCache.store).dispatch.apply(_a, args);
        },
        getContainer: undefined,
        initStateNamespaces: [],
        contextByAction: new WeakMap(),
        nextCacheId: 1,
        cacheById: new Map(),
        containerById: new Map(),
        containerByNamespace: new Map(),
        contextByModel: new Map()
    };
    storeCache.getContainer = createGetContainer(storeCache);
    return storeCache;
}

function createMiddleware(storeCache) {
    var rootActionSubject = new Subject();
    var rootAction$ = rootActionSubject;
    var rootStateSubject = new Subject();
    var rootState$ = rootStateSubject.pipe(distinctUntilChanged());
    return function (store) { return function (next) { return function (action) {
        var context = storeCache.contextByAction.get(action);
        if (context != null && context.model.autoRegister) {
            var container = storeCache.getContainer(context.model, context.key);
            if (container.canRegister) {
                container.register();
            }
        }
        var result = next(action);
        rootStateSubject.next(store.getState());
        rootActionSubject.next(action);
        if (context != null) {
            var effectDeferred_1 = context.effectDeferred != null
                ? context.effectDeferred
                : {
                    resolve: function () {
                        return;
                    },
                    reject: function (reason) {
                        setTimeout(function () {
                            if (storeCache.options.effectErrorHandler != null) {
                                storeCache.options.effectErrorHandler(reason);
                            }
                        }, 0);
                    }
                };
            var _a = parseActionType(action.type), namespace = _a.namespace, actionName = _a.actionName;
            var container_1 = storeCache.getContainer(context.model, context.key);
            if (container_1.isRegistered) {
                var modelContext = storeCache.contextByModel.get(container_1.model);
                var effect = modelContext
                    ? modelContext.effectByActionName[actionName]
                    : null;
                if (effect != null) {
                    var promise = effect({
                        rootAction$: rootAction$,
                        rootState$: rootState$,
                        dependencies: storeCache.dependencies,
                        namespace: namespace,
                        key: container_1.key,
                        getState: function () { return container_1.state; },
                        getters: container_1.getters,
                        actions: container_1.actions,
                        getContainer: storeCache.getContainer
                    }, action.payload);
                    promise.then(function (value) {
                        effectDeferred_1.resolve(value);
                    }, function (reason) {
                        effectDeferred_1.reject(reason);
                    });
                }
                else {
                    effectDeferred_1.resolve(undefined);
                }
            }
            else {
                effectDeferred_1.resolve(undefined);
            }
        }
        return result;
    }; }; };
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function createRootReduxReducer(storeCache) {
    return function (rootState, action) {
        if (rootState === undefined) {
            rootState = {};
        }
        var initialRootState;
        storeCache.initStateNamespaces.forEach(function (_namespace) {
            var _container = storeCache.containerByNamespace.get(_namespace);
            if (_container == null) {
                return;
            }
            if (rootState[_container.path] === undefined) {
                var initialState = _container.model.state({
                    dependencies: storeCache.dependencies,
                    props: _container.props,
                    key: _container.key
                });
                if (initialState !== undefined) {
                    if (initialRootState == null) {
                        initialRootState = {};
                    }
                    initialRootState[_container.path] = initialState;
                }
            }
        });
        storeCache.initStateNamespaces.length = 0;
        if (initialRootState != null) {
            rootState = __assign({}, rootState, initialRootState);
        }
        var _a = parseActionType(action.type), namespace = _a.namespace, actionName = _a.actionName;
        if (actionName === actionTypes.unregister) {
            rootState = __assign({}, rootState);
            delete rootState[convertNamespaceToPath(namespace)];
        }
        var container = storeCache.containerByNamespace.get(namespace);
        if (container == null) {
            return rootState;
        }
        var modelContext = storeCache.contextByModel.get(container.model);
        var reducer = modelContext
            ? modelContext.reducerByActionName[actionName]
            : null;
        if (reducer == null) {
            return rootState;
        }
        return produce(rootState, function (draft) {
            reducer(draft[container.path], action.payload, {
                dependencies: storeCache.dependencies,
                props: container.props,
                key: container.key,
                originalState: rootState[container.path]
            });
        });
    };
}

function createReduxAdvancedStore(dependencies, models, options) {
    if (options == null) {
        options = {};
    }
    if (options.resolveActionName == null) {
        options.resolveActionName = function (paths) { return paths[paths.length - 1]; };
    }
    var storeCache = createStoreCache();
    storeCache.options = options;
    storeCache.dependencies = dependencies;
    registerModels(storeCache, "", models);
    var rootReducer = createRootReduxReducer(storeCache);
    storeCache.addEpic$ = new BehaviorSubject(combineEpics.apply(void 0, storeCache.initialEpics));
    var rootEpic = function (action$, state$, epicDependencies) {
        return storeCache.addEpic$.pipe(mergeMap(function (epic) { return epic(action$, state$, epicDependencies); }));
    };
    var reduxAdvancedMiddleware = createMiddleware(storeCache);
    if (options.createStore != null) {
        storeCache.store = options.createStore(rootReducer, rootEpic, reduxAdvancedMiddleware);
    }
    else {
        var epicMiddleware = createEpicMiddleware();
        storeCache.store = createStore(rootReducer, applyMiddleware(reduxAdvancedMiddleware, epicMiddleware));
        epicMiddleware.run(rootEpic);
    }
    var store = storeCache.store;
    store.getContainer = storeCache.getContainer;
    return store;
}

export { actionTypes, createModelBuilder, createReduxAdvancedStore };
