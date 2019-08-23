import { createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import { catchError, filter, takeUntil, distinctUntilChanged, switchMap, mergeMap } from 'rxjs/operators';
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
            if (target[key] === undefined) {
                target[key] = {};
            }
            if (isObject(target[key])) {
                mapObjectDeeply(target[key], value, func, paths.concat([key]));
                return;
            }
        }
        var result = func(value, paths.concat([key]), target);
        if (result !== undefined) {
            target[key] = result;
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
    ActionHelperImpl.prototype.dispatch = function (payload) {
        var _this = this;
        if (this._container.canRegister &&
            this._container.model.options.autoRegister) {
            this._container.register();
        }
        var action = this.create(payload);
        var promise = new PatchedPromise(function (resolve, reject) {
            _this._storeContext.deferredByAction.set(action, {
                resolve: resolve,
                reject: function (reason) {
                    reject(reason);
                    Promise.resolve().then(function () {
                        if (!promise.hasRejectionHandler &&
                            _this._storeContext.options.defaultEffectErrorHandler) {
                            promise.catch(_this._storeContext.options.defaultEffectErrorHandler);
                        }
                    });
                }
            });
        });
        this._storeContext.store.dispatch(action);
        return promise;
    };
    return ActionHelperImpl;
}());
function createActionHelpers(storeContext, container) {
    var actionHelpers = {};
    mapObjectDeeply(actionHelpers, merge({}, container.model.reducers, container.model.effects), function (obj, paths) {
        return new ActionHelperImpl(storeContext, container, joinLastPart(container.namespace, storeContext.resolveActionName(paths)));
    });
    return actionHelpers;
}
var actionTypes = {
    register: "@@REGISTER",
    unregister: "@@UNREGISTER",
    reload: "@@RELOAD"
};
var batchRegisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.register);
var batchUnregisterActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.unregister);
var reloadActionHelper = new ActionHelperImpl(undefined, undefined, actionTypes.reload);

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
        var lastParams = cache.lastParams || [];
        var params = [];
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
function createGetters(storeContext, container) {
    var getters = {};
    var cacheByPath = new Map();
    mapObjectDeeply(getters, container.model.selectors, function (selector, paths, target) {
        var fullPath = paths.join(".");
        Object.defineProperty(target, paths[paths.length - 1], {
            get: function () {
                var cache = cacheByPath.get(fullPath);
                if (cache == null) {
                    cache = {};
                    cacheByPath.set(fullPath, cache);
                }
                return selector({
                    dependencies: storeContext.getDependencies(),
                    namespace: container.namespace,
                    key: container.key,
                    getState: function () { return container.getState(); },
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
        var args = model.args;
        var state = model.state;
        var selectors = model.selectors;
        var reducers = model.reducers;
        var effects = model.effects;
        var epics = model.epics;
        var options = model.options;
        if (namespace !== undefined) {
            args = function (context) {
                var _a;
                return (_a = {},
                    _a[namespace] = model.args(__assign({}, context)),
                    _a);
            };
            state = function (context) {
                var _a;
                return (_a = {},
                    _a[namespace] = model.state(__assign({}, context, { args: (context.args || {})[namespace] })),
                    _a);
            };
            selectors = (_a = {},
                _a[namespace] = mapObjectDeeply({}, model.selectors, function (oldSelector) {
                    var newSelector = function (context, cache) {
                        return oldSelector(__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }), cache);
                    };
                    return newSelector;
                }),
                _a);
            reducers = (_b = {},
                _b[namespace] = mapObjectDeeply({}, model.reducers, function (oldReducer) {
                    var newReducer = function (_state, payload, context) {
                        return oldReducer(_state[namespace], payload, __assign({}, context));
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
            options = __assign({}, options, { autoRegister: undefined });
        }
        this.dependencies()
            .args(args)
            .state(state)
            .selectors(selectors)
            .reducers(reducers)
            .effects(effects)
            .epics(epics)
            .options(options);
        return this;
    };
    ModelBuilder.prototype.dependencies = function () {
        if (this._isFrozen) {
            return this.clone().dependencies();
        }
        return this;
    };
    ModelBuilder.prototype.args = function (args) {
        if (this._isFrozen) {
            return this.clone().args(args);
        }
        var oldArgsFn = this._model.args;
        var newArgsFn = factoryWrapper(args);
        this._model.args = function (context) {
            var oldArgs = oldArgsFn(context);
            var newArgs = newArgsFn(context);
            return merge({}, oldArgs, newArgs);
        };
        return this;
    };
    ModelBuilder.prototype.overrideArgs = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideArgs(override);
        }
        var oldArgsFn = this._model.args;
        this._model.args = function (context) {
            var oldArgs = oldArgsFn(context);
            var newArgs = factoryWrapper(override(oldArgs))(context);
            return merge({}, oldArgs, newArgs);
        };
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
                obj["@@EPIC_" + ModelBuilder._nextEpicId] = epic;
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
    ModelBuilder.prototype.options = function (options) {
        if (this._isFrozen) {
            return this.clone().options(options);
        }
        this._model.options = merge({}, this._model.options, options);
        return this;
    };
    ModelBuilder.prototype.overrideOptions = function (override) {
        if (this._isFrozen) {
            return this.clone().overrideOptions(override);
        }
        this._model.options = merge({}, this._model.options, override(this._model.options));
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
        options: merge({}, model.options),
        args: model.args,
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
        options: {},
        args: function () { return ({}); },
        state: function () { return ({}); },
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
    var prevRegisteredModelsLength = registeredModels.length;
    registeredModels.push.apply(registeredModels, models);
    models.forEach(function (_model, index) {
        if (storeContext.contextByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        var reducerByActionName = new Map();
        mapObjectDeeply({}, _model.reducers, function (reducer, paths) {
            var actionName = storeContext.resolveActionName(paths);
            if (reducerByActionName.has(actionName)) {
                throw new Error("action name of reducer should be unique");
            }
            reducerByActionName.set(actionName, reducer);
        });
        var effectByActionName = new Map();
        mapObjectDeeply({}, _model.effects, function (effect, paths) {
            var actionName = storeContext.resolveActionName(paths);
            if (effectByActionName.has(actionName)) {
                throw new Error("action name of effect should be unique");
            }
            effectByActionName.set(actionName, effect);
        });
        storeContext.contextByModel.set(_model, {
            isDynamic: Array.isArray(model),
            modelIndex: prevRegisteredModelsLength + index,
            baseNamespace: namespace,
            basePath: convertNamespaceToPath(namespace),
            reducerByActionName: reducerByActionName,
            effectByActionName: effectByActionName,
            containerByKey: new Map()
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
            payloads.push.apply(payloads, registerModels(storeContext, modelNamespace, model));
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

var requiredArgToken = "@@REQUIRED_ARG__" + Date.now();
var requiredArgFunc = function (fakeValue) { return [
    requiredArgToken,
    fakeValue
]; };
function isRequiredArg(obj) {
    return Array.isArray(obj) && obj[0] === requiredArgToken;
}
function generateArgs(model, context, args, optional) {
    var result = model.args(context);
    if (args !== undefined) {
        merge(result, args);
    }
    mapObjectDeeply(result, result, function (value) {
        if (isRequiredArg(value)) {
            if (optional) {
                return value[1];
            }
            else {
                throw new Error("arg is required");
            }
        }
    });
    return result;
}

var stateModelsKey = "@@models";
function getSubState(rootState, basePath, key) {
    if (rootState == null) {
        return rootState;
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
        this._getStateCache = {
            rootState: {},
            value: undefined
        };
        this._modelContext = this._storeContext.contextByModel.get(this.model);
        this.namespace = joinLastPart(this._modelContext.baseNamespace, this.key);
    }
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.isRegistered;
            }
            var registeredContainer = this._storeContext.containerByNamespace.get(this.namespace);
            return (registeredContainer != null && registeredContainer.model === this.model);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.canRegister;
            }
            return !this._storeContext.containerByNamespace.has(this.namespace);
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.getRootState = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.getRootState();
        }
        return this._storeContext.adHocRootState !== undefined
            ? this._storeContext.adHocRootState
            : this._storeContext.store.getState();
    };
    ContainerImpl.prototype.getState = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.getState();
        }
        if (this.isRegistered) {
            var rootState = this.getRootState();
            if (this._getStateCache.rootState === rootState) {
                return this._getStateCache.value;
            }
            var value = getSubState(rootState, this._modelContext.basePath, this.key);
            this._getStateCache.rootState = rootState;
            this._getStateCache.value = value;
            return value;
        }
        if (this.canRegister) {
            if (this._cachedState === undefined) {
                var args = generateArgs(this.model, {
                    dependencies: this._storeContext.getDependencies(),
                    namespace: this.namespace,
                    key: this.key,
                    getContainer: this._storeContext.getContainer,
                    required: requiredArgFunc
                }, this._cachedArgs, true);
                this._cachedState = this.model.state({
                    dependencies: this._storeContext.getDependencies(),
                    namespace: this.namespace,
                    key: this.key,
                    args: args,
                    getContainer: this._storeContext.getContainer
                });
            }
            return this._cachedState;
        }
        throw new Error("namespace is already registered by other model");
    };
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.getters;
            }
            if (this.isRegistered || this.canRegister) {
                if (this._cachedGetters === undefined) {
                    this._cachedGetters = createGetters(this._storeContext, this);
                }
                return this._cachedGetters;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            var container = this._getCurrentContainer();
            if (container !== this) {
                return container.actions;
            }
            if (this.isRegistered || this.canRegister) {
                if (this._cachedActions === undefined) {
                    this._cachedActions = createActionHelpers(this._storeContext, this);
                }
                return this._cachedActions;
            }
            throw new Error("namespace is already registered by other model");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (args) {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.register(args);
        }
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        this._cachedArgs = args;
        this._cachedState = undefined;
        this._storeContext.store.dispatch(batchRegisterActionHelper.create([
            {
                namespace: this.namespace,
                model: this._modelContext.modelIndex,
                args: args
            }
        ]));
    };
    ContainerImpl.prototype.unregister = function () {
        var container = this._getCurrentContainer();
        if (container !== this) {
            return container.unregister();
        }
        if (this.isRegistered) {
            this._storeContext.store.dispatch(batchUnregisterActionHelper.create([
                {
                    namespace: this.namespace
                }
            ]));
        }
    };
    ContainerImpl.prototype._getCurrentContainer = function () {
        return this._storeContext.getContainer(this.model, this.key);
    };
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
        var container = modelContext.containerByKey.get(key);
        if (container == null) {
            container = new ContainerImpl(storeContext, model, key);
            modelContext.containerByKey.set(key, container);
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
        switchEpic$: new Subject(),
        adHocRootState: undefined,
        contextByModel: new Map(),
        modelsByBaseNamespace: new Map(),
        containerByNamespace: new Map(),
        deferredByAction: new WeakMap(),
        getDependencies: function () {
            return storeContext.options.dependencies;
        },
        resolveActionName: function (paths) {
            if (storeContext.options.resolveActionName) {
                return storeContext.options.resolveActionName(paths);
            }
            return paths.join(".");
        },
        parseNamespace: function (namespace) {
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
                dependencies: storeContext.getDependencies(),
                namespace: container.namespace,
                key: container.key,
                getState: function () { return container.getState(); },
                getters: container.getters,
                actions: container.actions,
                getContainer: storeContext.getContainer
            });
            if (storeContext.options.defaultEpicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeContext.options.defaultEpicErrorHandler));
            }
            outputObservables.push(output$);
        });
        var takeUntil$ = rootAction$.pipe(filter(function (action) {
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
            var _a = storeContext.parseNamespace(namespace), key = _a.key, models = _a.models;
            var model = models[modelIndex];
            var container = storeContext.getContainer(model, key);
            storeContext.containerByNamespace.set(namespace, container);
            var epic = createReduxObservableEpic(storeContext, container);
            storeContext.addEpic$.next(epic);
        });
    }
    function unregister(payloads) {
        payloads.forEach(function (payload) {
            var namespace = payload.namespace;
            var container = storeContext.containerByNamespace.get(namespace);
            storeContext.contextByModel
                .get(container.model)
                .containerByKey.delete(container.key);
            storeContext.containerByNamespace.delete(namespace);
        });
    }
    function reload(payload) {
        storeContext.containerByNamespace.clear();
        storeContext.contextByModel.forEach(function (context) {
            context.containerByKey.clear();
        });
        storeContext.switchEpic$.next();
        var batchRegisterPayloads = [];
        var rootState = payload && payload.state !== undefined
            ? payload.state
            : storeContext.store.getState();
        if (rootState != null) {
            storeContext.contextByModel.forEach(function (context) {
                var state = rootState[context.basePath];
                if (state != null) {
                    if (!context.isDynamic) {
                        batchRegisterPayloads.push({
                            namespace: context.baseNamespace
                        });
                    }
                    else {
                        var models_1 = state[stateModelsKey] || {};
                        Object.keys(models_1).forEach(function (key) {
                            var modelIndex = models_1[key];
                            if (typeof modelIndex === "number") {
                                batchRegisterPayloads.push({
                                    namespace: joinLastPart(context.baseNamespace, key),
                                    model: modelIndex
                                });
                            }
                        });
                    }
                }
            });
        }
        register(batchRegisterPayloads);
    }
    return function (store) { return function (next) { return function (action) {
        if (batchRegisterActionHelper.is(action)) {
            register(action.payload);
        }
        else if (batchUnregisterActionHelper.is(action)) {
            unregister(action.payload);
        }
        else if (reloadActionHelper.is(action)) {
            reload(action.payload);
        }
        var result = next(action);
        rootStateSubject.next(store.getState());
        rootActionSubject.next(action);
        var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
        var container = storeContext.containerByNamespace.get(namespace);
        if (container && container.isRegistered) {
            var deferred_1 = storeContext.deferredByAction.get(action);
            var modelContext = storeContext.contextByModel.get(container.model);
            var effect = modelContext.effectByActionName.get(actionName);
            if (effect != null) {
                var promise = effect({
                    rootAction$: rootAction$,
                    rootState$: rootState$,
                    dependencies: storeContext.getDependencies(),
                    namespace: container.namespace,
                    key: container.key,
                    getState: function () { return container.getState(); },
                    getters: container.getters,
                    actions: container.actions,
                    getContainer: storeContext.getContainer
                }, action.payload);
                promise.then(function (value) {
                    if (deferred_1) {
                        deferred_1.resolve(value);
                    }
                }, function (reason) {
                    if (deferred_1) {
                        deferred_1.reject(reason);
                    }
                    else if (storeContext.options.defaultEffectErrorHandler) {
                        storeContext.options.defaultEffectErrorHandler(reason);
                    }
                    else {
                        throw reason;
                    }
                });
            }
            else {
                if (deferred_1) {
                    deferred_1.resolve(undefined);
                }
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
                rootState = __assign({}, rootState, (_a = {}, _a[basePath] = setSubState(rootState[basePath], modelIndex, stateModelsKey, key), _a));
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
                rootState = __assign({}, rootState, (_a = {}, _a[basePath] = setSubState(rootState[basePath], undefined, stateModelsKey, key), _a));
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

function init(options) {
    var storeContext = createStoreContext();
    storeContext.options = options;
    var rootReducer = createReduxReducer(storeContext);
    var rootEpic = function (action$, state$) {
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        return storeContext.switchEpic$.pipe(switchMap(function () {
            return storeContext.addEpic$.pipe(mergeMap(function (epic) { return epic.apply(void 0, [action$, state$].concat(rest)); }));
        }));
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
    storeContext.switchEpic$.next();
    return {
        store: storeContext.store,
        getContainer: storeContext.getContainer,
        registerModels: createRegisterModels(storeContext),
        reload: function (state) {
            storeContext.store.dispatch(reloadActionHelper.create({ state: state }));
        }
    };
}

export { createModelBuilder, init };
