'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var redux = require('redux');
var reduxObservable = require('redux-observable');
var rxjs = require('rxjs');
var operators = require('rxjs/operators');
var produce = _interopDefault(require('immer'));

var nil = {};
function factoryWrapper(obj) {
    return typeof obj === "function" ? obj : function () { return obj; };
}
function isObject(obj) {
    return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
function mapObjectDeeply(target, source, func, override, paths) {
    if (override === void 0) { override = false; }
    if (paths === void 0) { paths = []; }
    Object.keys(source).forEach(function (key) {
        var value = source[key];
        if (isObject(value)) {
            var nextTarget = target[key];
            if (nextTarget === undefined) {
                nextTarget = {};
                target[key] = nextTarget;
            }
            if (!isObject(nextTarget)) {
                throw new Error("target[\"" + key + "\"] should be an object");
            }
            mapObjectDeeply(nextTarget, value, func, override, paths.concat([key]));
        }
        else {
            if (!override && target[key] !== undefined) {
                throw new Error("target[\"" + key + "\"] already has a value");
            }
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
            mapObjectDeeply(target, source, function (value) { return value; }, true);
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
        : [str, ""];
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
    mapObjectDeeply(actionHelpers, merge({}, container.model.reducers, container.model.effects), function (obj, paths) {
        return new ActionHelperImpl(storeCache, container, storeCache.options.resolveActionName(paths));
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
    mapObjectDeeply(getters, container.model.selectors, function (selector, paths, target) {
        Object.defineProperty(target, paths[paths.length - 1], {
            get: function () {
                return selector({
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
                    _a[namespace] = model.state({
                        dependencies: context.dependencies,
                        namespace: context.namespace,
                        key: context.key
                    }),
                    _a);
            };
            selectors = (_a = {},
                _a[namespace] = mapObjectDeeply({}, model.selectors, function (oldSelector) {
                    var newSelector = function (context, cacheKey) {
                        return oldSelector({
                            dependencies: context.dependencies,
                            namespace: context.namespace,
                            key: context.key,
                            state: context.state[namespace],
                            getters: context.getters[namespace],
                            actions: context.actions[namespace],
                            getContainer: context.getContainer
                        }, cacheKey);
                    };
                    if (oldSelector.__deleteCache != null) {
                        newSelector.__deleteCache = function (cacheKey) {
                            return oldSelector.__deleteCache(cacheKey);
                        };
                    }
                    return newSelector;
                }),
                _a);
            reducers = (_b = {},
                _b[namespace] = mapObjectDeeply({}, model.reducers, function (oldReducer) {
                    var newReducer = function (_state, payload, context) {
                        return oldReducer(_state[namespace], payload, {
                            dependencies: context.dependencies,
                            namespace: context.namespace,
                            key: context.key,
                            originalState: context.originalState[namespace]
                        });
                    };
                    return newReducer;
                }),
                _b);
            effects = (_c = {},
                _c[namespace] = mapObjectDeeply({}, model.effects, function (oldEffect) {
                    var newEffect = function (context, payload) {
                        return oldEffect({
                            rootAction$: context.rootAction$,
                            rootState$: context.rootState$,
                            dependencies: context.dependencies,
                            namespace: context.namespace,
                            key: context.key,
                            getState: function () { return context.getState()[namespace]; },
                            getters: context.getters[namespace],
                            actions: context.actions[namespace],
                            getContainer: context.getContainer
                        }, payload);
                    };
                    return newEffect;
                }),
                _c);
            epics = (_d = {},
                _d[namespace] = mapObjectDeeply({}, model.epics, function (oldEpic) {
                    var newEpic = function (context) {
                        return oldEpic({
                            rootAction$: context.rootAction$,
                            rootState$: context.rootState$,
                            dependencies: context.dependencies,
                            namespace: context.namespace,
                            key: context.key,
                            getState: function () { return context.getState()[namespace]; },
                            getters: context.getters[namespace],
                            actions: context.actions[namespace],
                            getContainer: context.getContainer
                        });
                    };
                    return newEpic;
                }),
                _d);
        }
        this.dependencies()
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
                obj["ANONYMOUS_EPIC_" + ModelBuilder._nextEpicId] = epic;
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
    ModelBuilder.prototype.autoRegister = function (value) {
        if (value === void 0) { value = true; }
        if (this._isFrozen) {
            return this.clone().autoRegister(value);
        }
        this._model.autoRegister = value;
        return this;
    };
    ModelBuilder.prototype.build = function () {
        var model = cloneModel(this._model);
        return model;
    };
    ModelBuilder._nextEpicId = 1;
    return ModelBuilder;
}());
function cloneModel(model) {
    return {
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
        model.autoRegister != null &&
        model.state != null &&
        model.selectors != null &&
        model.reducers != null &&
        model.effects != null &&
        model.epics != null &&
        typeof model.autoRegister === "boolean" &&
        typeof model.state === "function");
}
function createModelBuilder() {
    return new ModelBuilder({
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
        mapObjectDeeply({}, _model.reducers, function (reducer, paths) {
            var actionName = storeCache.options.resolveActionName(paths);
            if (reducerByActionName[actionName] != null) {
                throw new Error("action name of reducer should be unique");
            }
            reducerByActionName[actionName] = reducer;
        });
        var effectByActionName = {};
        mapObjectDeeply({}, _model.effects, function (effect, paths) {
            var actionName = storeCache.options.resolveActionName(paths);
            if (effectByActionName[actionName] != null) {
                throw new Error("action name of effect should be unique");
            }
            effectByActionName[actionName] = effect;
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
        var modelNamespace = joinLastPart(namespace, key);
        if (Array.isArray(model)) {
            registerModel(storeCache, modelNamespace, model);
        }
        else if (isModel(model)) {
            registerModel(storeCache, modelNamespace, model);
            storeCache.pendingInitContainers.push({
                container: storeCache.getContainer(model),
                initialState: undefined
            });
        }
        else {
            registerModels(storeCache, modelNamespace, model);
        }
    });
}

function createEpicsReduxObservableEpic(storeCache, container) {
    return function (rootAction$, rootState$) {
        var outputObservables = [];
        mapObjectDeeply({}, container.model.epics, function (epic) {
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
                output$ = output$.pipe(operators.catchError(storeCache.options.epicErrorHandler));
            }
            outputObservables.push(output$);
        });
        var takeUntil$ = rootAction$.ofType(container.namespace + "/" + actionTypes.unregister);
        return rxjs.merge.apply(void 0, outputObservables).pipe(operators.takeUntil(takeUntil$));
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
        this.namespace = joinLastPart(baseNamespace, this.key);
        this.path = convertNamespaceToPath(this.namespace);
    }
    Object.defineProperty(ContainerImpl.prototype, "_cache", {
        get: function () {
            var cache = this._storeCache.cacheById.get(this.id);
            if (cache == null) {
                cache = {
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
                        namespace: this.namespace,
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
    ContainerImpl.prototype.register = function (initialState) {
        if (!this.canRegister) {
            throw new Error("namespace is already registered");
        }
        initialState =
            initialState !== undefined
                ? factoryWrapper(initialState)({
                    dependencies: this._storeCache.dependencies,
                    namespace: this.namespace,
                    key: this.key
                })
                : undefined;
        this._storeCache.containerById.set(this.id, this);
        this._storeCache.containerByNamespace.set(this.namespace, this);
        this._storeCache.pendingInitStates.push({
            namespace: this.namespace,
            state: initialState
        });
        var epic = createEpicsReduxObservableEpic(this._storeCache, this);
        if (this._storeCache.initialized) {
            this._storeCache.addEpic$.next(epic);
            this._storeCache.dispatch({
                type: this.namespace + "/" + actionTypes.register
            });
        }
        else {
            this._storeCache.pendingInitEpics.push(epic);
        }
    };
    ContainerImpl.prototype.unregister = function () {
        if (this.isRegistered) {
            this._storeCache.containerByNamespace.delete(this.namespace);
            if (this._storeCache.initialized) {
                this._storeCache.dispatch({
                    type: this.namespace + "/" + actionTypes.unregister
                });
            }
        }
        this._clearCache();
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
        initialized: false,
        store: undefined,
        options: undefined,
        dependencies: undefined,
        getContainer: undefined,
        addEpic$: undefined,
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
        pendingInitContainers: [],
        pendingInitStates: [],
        pendingInitEpics: [],
        nextCacheId: 1,
        cacheById: new Map(),
        containerById: new Map(),
        containerByNamespace: new Map(),
        contextByModel: new Map(),
        contextByAction: new WeakMap()
    };
    storeCache.getContainer = createGetContainer(storeCache);
    return storeCache;
}

function createMiddleware(storeCache) {
    var rootActionSubject = new rxjs.Subject();
    var rootAction$ = rootActionSubject;
    var rootStateSubject = new rxjs.Subject();
    var rootState$ = rootStateSubject.pipe(operators.distinctUntilChanged());
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
            var _a = splitLastPart(action.type), namespace = _a[0], actionName = _a[1];
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
        var _a;
        if (rootState === undefined) {
            rootState = {};
        }
        var initialRootState;
        storeCache.pendingInitStates.forEach(function (_a) {
            var _namespace = _a.namespace, _state = _a.state;
            var _container = storeCache.containerByNamespace.get(_namespace);
            if (_container == null) {
                return;
            }
            if (rootState[_container.path] === undefined) {
                var initialState = _container.model.state({
                    dependencies: storeCache.dependencies,
                    namespace: _container.namespace,
                    key: _container.key
                });
                if (initialState !== undefined || _state !== undefined) {
                    if (initialRootState == null) {
                        initialRootState = {};
                    }
                    initialRootState[_container.path] = merge({}, initialState, _state);
                }
            }
        });
        storeCache.pendingInitStates.length = 0;
        if (initialRootState != null) {
            rootState = __assign({}, rootState, initialRootState);
        }
        var _b = splitLastPart(action.type), namespace = _b[0], actionName = _b[1];
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
        var state = rootState[container.path];
        var newState = produce(state, function (draft) {
            reducer(draft, action.payload, {
                dependencies: storeCache.dependencies,
                namespace: container.namespace,
                key: container.key,
                originalState: state
            });
        });
        if (newState !== state) {
            return __assign({}, rootState, (_a = {}, _a[container.path] = newState, _a));
        }
        else {
            return rootState;
        }
    };
}

function init(options) {
    if (options.resolveActionName == null) {
        options.resolveActionName = function (paths) { return paths[paths.length - 1]; };
    }
    var storeCache = createStoreCache();
    storeCache.options = options;
    storeCache.dependencies = options.dependencies;
    registerModels(storeCache, "", options.models);
    storeCache.pendingInitContainers.forEach(function (_a) {
        var container = _a.container, initialState = _a.initialState;
        container.register(initialState);
    });
    storeCache.pendingInitContainers.length = 0;
    var rootReducer = createRootReduxReducer(storeCache);
    storeCache.addEpic$ = new rxjs.BehaviorSubject(reduxObservable.combineEpics.apply(void 0, storeCache.pendingInitEpics));
    storeCache.pendingInitEpics.length = 0;
    var rootEpic = function (action$, state$, epicDependencies) {
        return storeCache.addEpic$.pipe(operators.mergeMap(function (epic) { return epic(action$, state$, epicDependencies); }));
    };
    var reduxAdvancedMiddleware = createMiddleware(storeCache);
    if (options.createStore != null) {
        storeCache.store = options.createStore(rootReducer, rootEpic, reduxAdvancedMiddleware);
    }
    else {
        var epicMiddleware = reduxObservable.createEpicMiddleware();
        storeCache.store = redux.createStore(rootReducer, redux.applyMiddleware(reduxAdvancedMiddleware, epicMiddleware));
        epicMiddleware.run(rootEpic);
    }
    storeCache.initialized = true;
    return {
        store: storeCache.store,
        getContainer: storeCache.getContainer
    };
}

exports.actionTypes = actionTypes;
exports.createModelBuilder = createModelBuilder;
exports.init = init;
