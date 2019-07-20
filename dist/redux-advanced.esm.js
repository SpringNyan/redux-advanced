import { createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import { catchError, filter, takeUntil, distinctUntilChanged, mergeMap } from 'rxjs/operators';
import { Subject, merge as merge$1 } from 'rxjs';
import produce from 'immer';

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

var nil = "__nil_" + Date.now();
function factoryWrapper(obj) {
    return typeof obj === "function" ? obj : function () { return obj; };
}
function isObject(obj) {
    return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
function mapObjectDeeply(target, source, func, paths) {
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
function merge(target) {
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
function convertNamespaceToPath(namespace) {
    return namespace.replace(/\//g, ".");
}
function joinLastPart(str, lastPart, splitter) {
    if (splitter === void 0) { splitter = "/"; }
    if (!lastPart) {
        return str;
    }
    if (!str) {
        return lastPart;
    }
    return "" + str + splitter + lastPart;
}
function splitLastPart(str, splitter) {
    if (splitter === void 0) { splitter = "/"; }
    var index = str.lastIndexOf(splitter);
    return index >= 0
        ? [str.substring(0, index), str.substring(index + 1)]
        : ["", str];
}
var PatchedPromise =  (function () {
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

var actionTypes = {
    register: "@@REGISTER",
    unregister: "@@UNREGISTER"
};
var ActionHelperImpl =  (function () {
    function ActionHelperImpl(_storeContext, _container, type) {
        this._storeContext = _storeContext;
        this._container = _container;
        this.type = type;
    }
    ActionHelperImpl.prototype.is = function (action) {
        return action != null && action.type === this.type;
    };
    ActionHelperImpl.prototype.create = function (payload) {
        return {
            type: this.type,
            payload: payload
        };
    };
    ActionHelperImpl.prototype.dispatch = function (payload, dispatch) {
        var _this = this;
        var action = this.create(payload);
        var promise = new PatchedPromise(function (resolve, reject) {
            _this._storeContext.contextByAction.set(action, {
                container: _this._container,
                deferred: {
                    resolve: resolve,
                    reject: function (reason) {
                        reject(reason);
                        Promise.resolve().then(function () {
                            if (!promise.hasRejectionHandler &&
                                _this._storeContext.options.catchEffectError) {
                                promise.catch(_this._storeContext.options.catchEffectError);
                            }
                        });
                    }
                }
            });
        });
        (dispatch || this._storeContext.store.dispatch)(action);
        return promise;
    };
    return ActionHelperImpl;
}());
function createActionHelpers(storeContext, container) {
    var actionHelpers = {};
    mapObjectDeeply(actionHelpers, merge({}, container.model.reducers, container.model.effects), function (obj, paths) {
        return new ActionHelperImpl(storeContext, container, joinLastPart(container.namespace, storeContext.options.resolveActionName(paths)));
    });
    return actionHelpers;
}
function createActionHelperDispatch(storeContext, container) {
    var dispatch = function (action) {
        if (actionHelperDispatch === container.cache.cachedDispatch) {
            storeContext.store.dispatch(action);
        }
        else {
            throw new Error("container is already unregistered");
        }
        return action;
    };
    var actionHelperDispatch = function (actionHelper, payload) {
        return actionHelper.dispatch(payload, dispatch);
    };
    return actionHelperDispatch;
}
var batchRegisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.register);
var batchUnregisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.unregister);
function parseBatchRegisterPayloads(action) {
    if (batchRegisterActionHelper.is(action)) {
        return action.payload || [];
    }
    var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
    if (actionName === actionTypes.register) {
        return [__assign({}, action.payload, { namespace: namespace })];
    }
    return null;
}
function parseBatchUnregisterPayloads(action) {
    if (batchUnregisterActionHelper.is(action)) {
        return action.payload || [];
    }
    var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
    if (actionName === actionTypes.unregister) {
        return [__assign({}, action.payload, { namespace: namespace })];
    }
    return null;
}
function createRegisterActionHelper(namespace) {
    return new ActionHelperImpl(undefined, undefined, joinLastPart(namespace, actionTypes.register));
}
function createUnregisterActionHelper(namespace) {
    return new ActionHelperImpl(undefined, undefined, joinLastPart(namespace, actionTypes.unregister));
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
    var resultSelector = function (context, cache) {
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
    return resultSelector;
});
function createGetters(storeContext, container) {
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
    ModelBuilder.prototype.extend = function (model, namespace) {
        var _a, _b, _c, _d;
        if (this._isFrozen) {
            return this.clone().extend(model, namespace);
        }
        var state = model.state;
        var selectors = model.selectors;
        var reducers = model.reducers;
        var effects = model.effects;
        var epics = model.epics;
        if (namespace !== undefined) {
            state = function (context) {
                var _a;
                return (_a = {},
                    _a[namespace] = model.state(__assign({}, context, { args: (context.args || {})[namespace] })),
                    _a);
            };
            selectors = (_a = {},
                _a[namespace] = mapObjectDeeply({}, model.selectors, function (oldSelector) {
                    var newSelector = function (context, cache) {
                        return oldSelector(__assign({}, context, { state: (context.state || {})[namespace], getters: context.getters[namespace], actions: context.actions[namespace] }), cache);
                    };
                    return newSelector;
                }),
                _a);
            reducers = (_b = {},
                _b[namespace] = mapObjectDeeply({}, model.reducers, function (oldReducer) {
                    var newReducer = function (_state, payload, context) {
                        return oldReducer(_state[namespace], payload, __assign({}, context, { originalState: (context.originalState || {})[namespace] }));
                    };
                    return newReducer;
                }),
                _b);
            effects = (_c = {},
                _c[namespace] = mapObjectDeeply({}, model.effects, function (oldEffect) {
                    var newEffect = function (context, payload) {
                        return oldEffect(__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }), payload);
                    };
                    return newEffect;
                }),
                _c);
            epics = (_d = {},
                _d[namespace] = mapObjectDeeply({}, model.epics, function (oldEpic) {
                    var newEpic = function (context) {
                        return oldEpic(__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }));
                    };
                    return newEpic;
                }),
                _d);
        }
        this.dependencies()
            .args()
            .state(state)
            .selectors(selectors)
            .reducers(reducers)
            .effects(effects)
            .epics(epics);
        return this;
    };
    ModelBuilder.prototype.dependencies = function () {
        if (this._isFrozen) {
            return this.clone().dependencies();
        }
        return this;
    };
    ModelBuilder.prototype.args = function () {
        if (this._isFrozen) {
            return this.clone().args();
        }
        return this;
    };
    ModelBuilder.prototype.state = function (state) {
        if (this._isFrozen) {
            return this.clone().state(state);
        }
        var oldStateFn = this._model.state;
        var newStateFn = factoryWrapper(state);
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
            var newState = factoryWrapper(override(oldState))(context);
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
        if (Array.isArray(epics)) {
            epics = epics.reduce(function (obj, epic) {
                obj["__ANONYMOUS_EPIC_" + ModelBuilder._nextEpicId] = epic;
                ModelBuilder._nextEpicId += 1;
                return obj;
            }, {});
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
    ModelBuilder.prototype.build = function () {
        return cloneModel(this._model);
    };
    ModelBuilder._nextEpicId = 1;
    return ModelBuilder;
}());
function cloneModel(model) {
    return {
        state: model.state,
        selectors: merge({}, model.selectors),
        reducers: merge({}, model.reducers),
        effects: merge({}, model.effects),
        epics: merge({}, model.epics)
    };
}
function isModel(obj) {
    var model = obj;
    return model != null && typeof model.state === "function";
}
function createModelBuilder() {
    return new ModelBuilder({
        state: function () { return undefined; },
        selectors: {},
        reducers: {},
        effects: {},
        epics: {}
    });
}
function registerModel(storeContext, namespace, model) {
    var models = Array.isArray(model) ? model : [model];
    var registeredModels = storeContext.modelsByBaseNamespace.get(namespace);
    if (registeredModels == null) {
        registeredModels = [];
        storeContext.modelsByBaseNamespace.set(namespace, registeredModels);
    }
    registeredModels.push.apply(registeredModels, models);
    models.forEach(function (_model) {
        if (storeContext.contextByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        var reducerByActionName = new Map();
        mapObjectDeeply({}, _model.reducers, function (reducer, paths) {
            var actionName = storeContext.options.resolveActionName(paths);
            if (reducerByActionName.has(actionName)) {
                throw new Error("action name of reducer should be unique");
            }
            reducerByActionName.set(actionName, reducer);
        });
        var effectByActionName = new Map();
        mapObjectDeeply({}, _model.effects, function (effect, paths) {
            var actionName = storeContext.options.resolveActionName(paths);
            if (effectByActionName.has(actionName)) {
                throw new Error("action name of effect should be unique");
            }
            effectByActionName.set(actionName, effect);
        });
        storeContext.contextByModel.set(_model, {
            baseNamespace: namespace,
            isDynamic: Array.isArray(model),
            reducerByActionName: reducerByActionName,
            effectByActionName: effectByActionName,
            idByKey: new Map()
        });
    });
}
function registerModels(storeContext, namespace, models) {
    var payloads = [];
    Object.keys(models).forEach(function (key) {
        var model = models[key];
        var modelNamespace = joinLastPart(namespace, key);
        if (Array.isArray(model)) {
            registerModel(storeContext, modelNamespace, model);
        }
        else if (isModel(model)) {
            registerModel(storeContext, modelNamespace, model);
            payloads.push({
                namespace: modelNamespace
            });
        }
        else {
            var childPayloads = registerModels(storeContext, modelNamespace, model);
            payloads.push.apply(payloads, childPayloads);
        }
    });
    return payloads;
}
function createRegisterModels(storeContext) {
    return function (models) {
        var payloads = registerModels(storeContext, "", models);
        storeContext.store.dispatch(batchRegisterActionHelper.create(payloads));
    };
}

var stateModelsKey = "__models";
function getSubState(rootState, basePath, key) {
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
function setSubState(rootState, value, basePath, key) {
    var _a;
    if (rootState == null) {
        rootState = {};
    }
    if (key === undefined) {
        if (rootState[basePath] === value) {
            return rootState;
        }
        rootState = __assign({}, rootState);
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
        return __assign({}, rootState, (_a = {}, _a[basePath] = state, _a));
    }
}

var ContainerImpl =  (function () {
    function ContainerImpl(_storeContext, model, key) {
        this._storeContext = _storeContext;
        this.model = model;
        this.key = key;
        var modelContext = this._storeContext.contextByModel.get(this.model);
        this.baseNamespace = modelContext.baseNamespace;
        this.id = modelContext.idByKey.get(this.key);
        this.namespace = joinLastPart(this.baseNamespace, this.key);
        this.basePath = convertNamespaceToPath(this.baseNamespace);
    }
    Object.defineProperty(ContainerImpl.prototype, "cache", {
        get: function () {
            var cache = this._storeContext.cacheById.get(this.id);
            if (cache == null) {
                cache = {
                    cachedArgs: undefined,
                    cachedState: nil,
                    cachedGetters: undefined,
                    cachedActions: undefined,
                    cachedDispatch: undefined,
                    selectorCacheByPath: new Map()
                };
                this._storeContext.cacheById.set(this.id, cache);
            }
            return cache;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._storeContext.containerByNamespace.get(this.namespace);
            return container != null && container.model === this.model;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            return !this._storeContext.containerByNamespace.has(this.namespace);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "state", {
        get: function () {
            if (this.isRegistered) {
                return getSubState(this._storeContext.store.getState(), this.basePath, this.key);
            }
            if (this.canRegister) {
                var cache = this.cache;
                if (cache.cachedState === nil) {
                    cache.cachedState = this.model.state({
                        dependencies: this._storeContext.options.dependencies,
                        namespace: this.namespace,
                        key: this.key,
                        args: cache.cachedArgs
                    });
                }
                return cache.cachedState;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedGetters === undefined) {
                    cache.cachedGetters = createGetters(this._storeContext, this);
                }
                return cache.cachedGetters;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedActions === undefined) {
                    cache.cachedActions = createActionHelpers(this._storeContext, this);
                }
                return cache.cachedActions;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "dispatch", {
        get: function () {
            if (this.isRegistered || this.canRegister) {
                var cache = this.cache;
                if (cache.cachedDispatch === undefined) {
                    cache.cachedDispatch = createActionHelperDispatch(this._storeContext, this);
                }
                return cache.cachedDispatch;
            }
            throw new Error("namespace is already registered by other container");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (args) {
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        var cache = this.cache;
        cache.cachedArgs = args;
        cache.cachedState = nil;
        var models = this._storeContext.modelsByBaseNamespace.get(this.baseNamespace);
        var modelIndex = models.indexOf(this.model);
        this._storeContext.store.dispatch(createRegisterActionHelper(this.namespace).create({
            model: modelIndex,
            args: args
        }));
    };
    ContainerImpl.prototype.unregister = function () {
        if (this.isRegistered) {
            this._storeContext.store.dispatch(createUnregisterActionHelper(this.namespace).create({}));
        }
        else {
            this.clearCache();
        }
    };
    ContainerImpl.prototype.clearCache = function () {
        this._storeContext.containerById.delete(this.id);
        this._storeContext.cacheById.delete(this.id);
    };
    ContainerImpl.nextId = 1;
    return ContainerImpl;
}());
function createGetContainer(storeContext) {
    return function (model, key) {
        var modelContext = storeContext.contextByModel.get(model);
        if (modelContext == null) {
            throw new Error("model is not registered yet");
        }
        if (key === undefined && modelContext.isDynamic) {
            throw new Error("key should be provided for dynamic model");
        }
        if (key !== undefined && !modelContext.isDynamic) {
            throw new Error("key should not be provided for static model");
        }
        var id = modelContext.idByKey.get(key);
        if (id == null) {
            id = ContainerImpl.nextId;
            ContainerImpl.nextId += 1;
            modelContext.idByKey.set(key, id);
        }
        var container = storeContext.containerById.get(id);
        if (container == null) {
            container = new ContainerImpl(storeContext, model, key);
            storeContext.containerById.set(id, container);
        }
        return container;
    };
}

function createStoreContext() {
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

function createReduxObservableEpic(storeContext, container) {
    return function (rootAction$, rootState$) {
        var outputObservables = [];
        mapObjectDeeply({}, container.model.epics, function (epic) {
            var output$ = epic({
                rootAction$: rootAction$,
                rootState$: rootState$,
                dependencies: storeContext.options.dependencies,
                namespace: container.namespace,
                key: container.key,
                getState: function () { return container.state; },
                getters: container.getters,
                actions: container.actions,
                getContainer: storeContext.getContainer
            });
            if (storeContext.options.catchEpicError != null) {
                output$ = output$.pipe(catchError(storeContext.options.catchEpicError));
            }
            outputObservables.push(output$);
        });
        var unregisterActionType = createUnregisterActionHelper(container.namespace).type;
        var takeUntil$ = rootAction$.pipe(filter(function (action) {
            if (action.type === unregisterActionType) {
                return true;
            }
            if (batchUnregisterActionHelper.is(action)) {
                return (action.payload || []).some(function (payload) { return payload.namespace === container.namespace; });
            }
            return false;
        }));
        return merge$1.apply(void 0, outputObservables).pipe(takeUntil(takeUntil$));
    };
}

function createMiddleware(storeContext) {
    var rootActionSubject = new Subject();
    var rootAction$ = rootActionSubject;
    var rootStateSubject = new Subject();
    var rootState$ = rootStateSubject.pipe(distinctUntilChanged());
    function register(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var modelIndex = payload.model || 0;
            var _a = storeContext.findModelsInfo(namespace), key = _a.key, models = _a.models;
            var model = models[modelIndex];
            var container = storeContext.getContainer(model, key);
            storeContext.containerById.set(container.id, container);
            storeContext.containerByNamespace.set(namespace, container);
            var epic = createReduxObservableEpic(storeContext, container);
            storeContext.addEpic$.next(epic);
        });
    }
    function unregister(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var container = storeContext.containerByNamespace.get(namespace);
            container.clearCache();
            storeContext.containerByNamespace.delete(namespace);
        });
    }
    return function (store) { return function (next) { return function (action) {
        var container;
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var actionContext = storeContext.contextByAction.get(action);
        var batchRegisterPayloads = parseBatchRegisterPayloads(action);
        if (batchRegisterPayloads) {
            register(batchRegisterPayloads);
        }
        var batchUnregisterPayloads = parseBatchUnregisterPayloads(action);
        if (batchUnregisterPayloads) {
            unregister(batchUnregisterPayloads);
        }
        if (!batchRegisterPayloads && !batchUnregisterPayloads) {
            if (actionContext && actionContext.container.canRegister) {
                actionContext.container.register();
            }
            var modelsInfo = storeContext.findModelsInfo(namespace);
            if (modelsInfo != null) {
                var baseNamespace = modelsInfo.baseNamespace, key = modelsInfo.key, models = modelsInfo.models;
                var basePath = convertNamespaceToPath(baseNamespace);
                var modelIndex = getSubState((store.getState() || {})[stateModelsKey], basePath, key);
                if (modelIndex != null) {
                    var model = models[modelIndex];
                    container = storeContext.getContainer(model, key);
                }
            }
        }
        var result = next(action);
        rootStateSubject.next(store.getState());
        rootActionSubject.next(action);
        var hasEffect = false;
        if (actionContext) {
            var deferred_1 = actionContext.deferred;
            if (container && container.isRegistered) {
                var modelContext = storeContext.contextByModel.get(container.model);
                var effect = modelContext.effectByActionName.get(actionName);
                if (effect != null) {
                    hasEffect = true;
                    var promise = effect({
                        rootAction$: rootAction$,
                        rootState$: rootState$,
                        dependencies: storeContext.options.dependencies,
                        namespace: container.namespace,
                        key: container.key,
                        getState: function () { return container.state; },
                        getters: container.getters,
                        actions: container.actions,
                        getContainer: storeContext.getContainer,
                        dispatch: container.dispatch
                    }, action.payload);
                    promise.then(function (value) {
                        if (deferred_1) {
                            deferred_1.resolve(value);
                        }
                    }, function (reason) {
                        if (deferred_1) {
                            deferred_1.reject(reason);
                        }
                        else if (storeContext.options.catchEffectError) {
                            storeContext.options.catchEffectError(reason);
                        }
                        else {
                            throw reason;
                        }
                    });
                }
            }
            if (!hasEffect && deferred_1) {
                deferred_1.resolve(undefined);
            }
        }
        return result;
    }; }; };
}

function createReduxReducer(storeContext) {
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
            rootState = __assign({}, rootState, (_a = {}, _a[stateModelsKey] = setSubState(rootState[stateModelsKey], modelIndex, basePath, key), _a));
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
            rootState = __assign({}, rootState, (_a = {}, _a[stateModelsKey] = setSubState(rootState[stateModelsKey], undefined, basePath, key), _a));
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

function init(options) {
    if (options.resolveActionName == null) {
        options.resolveActionName = function (paths) { return paths.join("."); };
    }
    var storeContext = createStoreContext();
    storeContext.options = options;
    var rootReducer = createReduxReducer(storeContext);
    var rootEpic = function (action$, state$) {
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        return storeContext.addEpic$.pipe(mergeMap(function (epic) { return epic.apply(void 0, [action$, state$].concat(rest)); }));
    };
    var middleware = createMiddleware(storeContext);
    if (options.createStore != null) {
        storeContext.store = options.createStore({
            reducer: rootReducer,
            epic: rootEpic,
            middleware: middleware
        });
    }
    else {
        var epicMiddleware = createEpicMiddleware();
        storeContext.store = createStore(rootReducer, applyMiddleware(middleware, epicMiddleware));
        epicMiddleware.run(rootEpic);
    }
    return {
        store: storeContext.store,
        getContainer: storeContext.getContainer,
        registerModels: createRegisterModels(storeContext)
    };
}

export { actionTypes, createModelBuilder, init };
