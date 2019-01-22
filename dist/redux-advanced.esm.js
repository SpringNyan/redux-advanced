import { Observable, empty, merge, BehaviorSubject } from 'rxjs';
import { mergeMap, takeUntil, catchError } from 'rxjs/operators';
import { createStore, applyMiddleware } from 'redux';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import produce from 'immer';

var actionTypes = {
    register: "@@REGISTER",
    epicEnd: "@@EPIC_END",
    unregister: "@@UNREGISTER"
};
var ActionHelperImpl =  (function () {
    function ActionHelperImpl(_storeCache, type) {
        var _this = this;
        this._storeCache = _storeCache;
        this.type = type;
        this.is = function (action) {
            return action != null && action.type === _this.type;
        };
        this.create = function (payload) {
            return {
                type: _this.type,
                payload: payload
            };
        };
        this.dispatch = function (payload, dispatch) {
            var action = _this.create(payload);
            if (dispatch == null) {
                dispatch = _this._storeCache.dispatch;
            }
            var promise = new Promise(function (resolve, reject) {
                _this._storeCache.effectDispatchHandlerByAction.set(action, {
                    hasEffect: false,
                    resolve: function () {
                        resolve();
                        _this._storeCache.effectDispatchHandlerByAction.delete(action);
                    },
                    reject: function (err) {
                        reject(err);
                        _this._storeCache.effectDispatchHandlerByAction.delete(action);
                    }
                });
            });
            dispatch(action);
            Promise.resolve().then(function () {
                var handler = _this._storeCache.effectDispatchHandlerByAction.get(action);
                if (handler != null && !handler.hasEffect) {
                    handler.resolve();
                }
            });
            return promise;
        };
    }
    return ActionHelperImpl;
}());
function createActionHelpers(storeCache, container) {
    var actionHelpers = {};
    Object.keys(container.model.reducers).concat(Object.keys(container.model.effects)).forEach(function (key) {
        if (!(key in actionHelpers)) {
            var actionHelper_1 = new ActionHelperImpl(storeCache, container.namespace + "/" + key);
            Object.defineProperty(actionHelpers, key, {
                get: function () {
                    if (container.canRegister && container.model.autoRegister) {
                        container.register();
                    }
                    return actionHelper_1;
                },
                enumerable: true,
                configurable: true
            });
        }
    });
    return actionHelpers;
}

var namespaceSplitterRegExp = new RegExp("/", "g");
function convertNamespaceToPath(namespace) {
    return namespace.replace(namespaceSplitterRegExp, ".");
}
function parseActionType(type) {
    var lastSplitterIndex = type.lastIndexOf("/");
    var namespace = type.substring(0, lastSplitterIndex);
    var key = type.substring(lastSplitterIndex + 1);
    return { namespace: namespace, key: key };
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

function toActionObservable(effectDispatch) {
    return new Observable(function (subscribe) {
        var dispatch = function (action) {
            subscribe.next(action);
            return action;
        };
        effectDispatch(dispatch).then(function () { return subscribe.complete(); }, function (reason) { return subscribe.error(reason); });
    });
}
function createEffectsRootReduxObservableEpic(storeCache) {
    return function (rootAction$, rootState$) {
        return rootAction$.pipe(mergeMap(function (action) {
            var actionType = "" + action.type;
            var _a = parseActionType(actionType), namespace = _a.namespace, key = _a.key;
            var container = storeCache.containerByNamespace[namespace];
            if (container == null) {
                return empty();
            }
            var effect = container.model.effects[key];
            if (effect == null) {
                return empty();
            }
            var effectDispatchHandler = storeCache.effectDispatchHandlerByAction.get(action);
            if (effectDispatchHandler != null) {
                effectDispatchHandler.hasEffect = true;
            }
            var effectDispatch = effect({
                rootAction$: rootAction$,
                rootState$: rootState$,
                namespace: namespace,
                dependencies: storeCache.dependencies,
                props: container.props,
                key: container.key,
                getState: function () { return container.state; },
                getters: container.getters,
                actions: container.actions,
                useContainer: storeCache.useContainer
            }, action.payload);
            var wrappedEffectDispatch = function (dispatch) {
                var promise = effectDispatch(dispatch);
                promise.then(function () {
                    if (effectDispatchHandler != null) {
                        effectDispatchHandler.resolve();
                    }
                }, function (reason) {
                    if (effectDispatchHandler != null) {
                        effectDispatchHandler.reject(reason);
                    }
                });
                if (storeCache.options.effectErrorHandler != null) {
                    promise = promise.catch(function (reason) {
                        return storeCache.options.effectErrorHandler(reason, dispatch);
                    });
                }
                return promise;
            };
            var takeUntil$ = rootAction$.ofType(namespace + "/" + actionTypes.unregister);
            var output$ = toActionObservable(wrappedEffectDispatch).pipe(takeUntil(takeUntil$));
            return output$;
        }));
    };
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

var createSelector = (function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var selectors = args.slice(0, args.length - 1);
    var combiner = args[args.length - 1];
    var cacheByKey = {};
    var resultSelector = function (context, cacheKey) {
        if (cacheKey == null) {
            cacheKey = "";
        }
        if (cacheByKey[cacheKey] == null) {
            cacheByKey[cacheKey] = {
                lastParams: undefined,
                lastResult: undefined
            };
        }
        var cache = cacheByKey[cacheKey];
        var needUpdate = false;
        var params = selectors.map(function (selector) { return selector(context); });
        if (cache.lastParams == null ||
            params.some(function (param, index) { return param !== cache.lastParams[index]; })) {
            needUpdate = true;
        }
        if (needUpdate) {
            cache.lastParams = params;
            cache.lastResult = combiner.apply(void 0, params.concat([context]));
        }
        return cache.lastResult;
    };
    resultSelector.__deleteCache = function (cacheKey) {
        delete cacheByKey[cacheKey];
    };
    return resultSelector;
});
function createGetters(storeCache, container) {
    var getters = {};
    Object.keys(container.model.selectors).forEach(function (key) {
        Object.defineProperty(getters, key, {
            get: function () {
                var selector = container.model.selectors[key];
                return selector({
                    dependencies: storeCache.dependencies,
                    props: container.props,
                    key: container.key,
                    state: container.state,
                    getters: getters,
                    actions: container.actions,
                    useContainer: storeCache.useContainer
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
            .epics(model.epics)
            .autoRegister(model.autoRegister);
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
            return __assign({}, oldProps, newProps);
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
            return __assign({}, oldState, newState);
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
        this._model.selectors = __assign({}, this._model.selectors, selectors);
        return this;
    };
    ModelBuilder.prototype.reducers = function (reducers) {
        if (this._isFrozen) {
            return this.clone().reducers(reducers);
        }
        this._model.reducers = __assign({}, this._model.reducers, reducers);
        return this;
    };
    ModelBuilder.prototype.effects = function (effects) {
        if (this._isFrozen) {
            return this.clone().effects(effects);
        }
        this._model.effects = __assign({}, this._model.effects, effects);
        return this;
    };
    ModelBuilder.prototype.epics = function (epics) {
        if (this._isFrozen) {
            return this.clone().epics(epics);
        }
        this._model.epics = this._model.epics.concat(epics);
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
        selectors: __assign({}, model.selectors),
        reducers: __assign({}, model.reducers),
        effects: __assign({}, model.effects),
        epics: model.epics.slice()
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
        epics: []
    });
}
function registerModel(storeCache, namespace, model) {
    var models = Array.isArray(model) ? model : [model];
    models.forEach(function (_model) {
        if (storeCache.namespaceByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        storeCache.namespaceByModel.set(_model, namespace);
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
            storeCache.useContainer(model).register();
        }
        else {
            registerModels(storeCache, modelNamespace, model);
        }
    });
}

function createEpicsReduxObservableEpic(storeCache, container) {
    return function (rootAction$, rootState$) {
        var namespace = container.namespace;
        var outputObservables = container.model.epics.map(function (epic) {
            var output$ = epic({
                rootAction$: rootAction$,
                rootState$: rootState$,
                namespace: namespace,
                dependencies: storeCache.dependencies,
                props: container.props,
                key: container.key,
                getState: function () { return container.state; },
                getters: container.getters,
                actions: container.actions,
                useContainer: storeCache.useContainer
            });
            if (storeCache.options.epicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
            }
            return output$;
        });
        var takeUntil$ = rootAction$.ofType(namespace + "/" + actionTypes.unregister);
        return merge.apply(void 0, outputObservables).pipe(takeUntil(takeUntil$));
    };
}

var ContainerImpl =  (function () {
    function ContainerImpl(_storeCache, model, baseNamespace, key) {
        this._storeCache = _storeCache;
        this.model = model;
        this.baseNamespace = baseNamespace;
        this.key = key;
        this._defaultState = ContainerImpl._nothing;
        this.id = "" + ContainerImpl._nextId;
        ContainerImpl._nextId += 1;
        this.namespace = buildNamespace(this.baseNamespace, this.key);
        this.path = convertNamespaceToPath(this.namespace);
        this.props = this._createProps();
    }
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var container = this._storeCache.containerByNamespace[this.namespace];
            return container != null && container.model === this.model;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            return this._storeCache.containerByNamespace[this.namespace] == null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "state", {
        get: function () {
            if (this.canRegister && this.model.autoRegister) {
                if (this._defaultState === ContainerImpl._nothing) {
                    this._defaultState = this.model.state({
                        dependencies: this._storeCache.dependencies,
                        props: this.props,
                        key: this.key
                    });
                }
                return this._defaultState;
            }
            if (this.isRegistered) {
                return this._storeCache.getState()[this.path];
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            if (this._cachedGetters === undefined) {
                this._cachedGetters = createGetters(this._storeCache, this);
            }
            if (this.canRegister && this.model.autoRegister) {
                return this._cachedGetters;
            }
            if (this.isRegistered) {
                return this._cachedGetters;
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            if (this._cachedActions === undefined) {
                this._cachedActions = createActionHelpers(this._storeCache, this);
            }
            if (this.canRegister && this.model.autoRegister) {
                return this._cachedActions;
            }
            if (this.isRegistered) {
                return this._cachedActions;
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (props) {
        if (!this.canRegister) {
            throw new Error("namespace is already used");
        }
        this._clearCache();
        this.props = this._createProps(props);
        this._storeCache.containerByNamespace[this.namespace] = this;
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
        if (!this.isRegistered) {
            throw new Error("container is not registered yet");
        }
        this._storeCache.dispatch({
            type: this.namespace + "/" + actionTypes.epicEnd
        });
        delete this._storeCache.containerByNamespace[this.namespace];
        this._storeCache.dispatch({
            type: this.namespace + "/" + actionTypes.unregister
        });
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
        this._defaultState = ContainerImpl._nothing;
        Object.keys(this.model.selectors).forEach(function (key) {
            var selector = _this.model.selectors[key];
            if (selector.__deleteCache != null) {
                selector.__deleteCache(_this.id);
            }
        });
    };
    ContainerImpl._nothing = {};
    ContainerImpl._nextId = 1;
    return ContainerImpl;
}());

function createStoreCache() {
    var storeCache = {
        store: undefined,
        options: undefined,
        dependencies: undefined,
        addEpic$: undefined,
        initialEpics: [],
        getState: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _a;
            return (_a = storeCache.store).getState.apply(_a, args);
        },
        dispatch: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _a;
            return (_a = storeCache.store).dispatch.apply(_a, args);
        },
        useContainer: function (model, key) {
            if (!storeCache.namespaceByModel.has(model)) {
                throw new Error("model is not registered yet");
            }
            var baseNamespace = storeCache.namespaceByModel.get(model);
            var namespace = buildNamespace(baseNamespace, key);
            var container = storeCache.containerByNamespace[namespace];
            if (container == null || container.model !== model) {
                return new ContainerImpl(storeCache, model, baseNamespace, key);
            }
            else {
                return container;
            }
        },
        initStateNamespaces: [],
        effectDispatchHandlerByAction: new Map(),
        containerByNamespace: {},
        namespaceByModel: new Map()
    };
    return storeCache;
}

function createRootReduxReducer(storeCache) {
    return function (rootState, action) {
        if (rootState === undefined) {
            rootState = {};
        }
        var initialRootState;
        storeCache.initStateNamespaces.forEach(function (_namespace) {
            var _container = storeCache.containerByNamespace[_namespace];
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
        storeCache.initStateNamespaces = [];
        if (initialRootState != null) {
            rootState = __assign({}, rootState, initialRootState);
        }
        var actionType = "" + action.type;
        var _a = parseActionType(actionType), namespace = _a.namespace, key = _a.key;
        if (key === actionTypes.unregister) {
            rootState = __assign({}, rootState);
            delete rootState[convertNamespaceToPath(namespace)];
        }
        var container = storeCache.containerByNamespace[namespace];
        if (container == null) {
            return rootState;
        }
        var reducer = container.model.reducers[key];
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

function createAdvancedStore(dependencies, models, options) {
    if (options == null) {
        options = {};
    }
    var storeCache = createStoreCache();
    storeCache.options = options;
    storeCache.dependencies = dependencies;
    registerModels(storeCache, "", models);
    var rootReducer = createRootReduxReducer(storeCache);
    var effectRootEpic = createEffectsRootReduxObservableEpic(storeCache);
    storeCache.addEpic$ = new BehaviorSubject(combineEpics.apply(void 0, [effectRootEpic].concat(storeCache.initialEpics)));
    var rootEpic = function (action$, state$, epicDependencies) {
        return storeCache.addEpic$.pipe(mergeMap(function (epic) { return epic(action$, state$, epicDependencies); }));
    };
    if (options.createStore != null) {
        storeCache.store = options.createStore(rootReducer, rootEpic);
    }
    else {
        var epicMiddleware = createEpicMiddleware();
        storeCache.store = createStore(rootReducer, applyMiddleware(epicMiddleware));
        epicMiddleware.run(rootEpic);
    }
    var store = storeCache.store;
    store.useContainer = storeCache.useContainer;
    return store;
}

export { toActionObservable, createModelBuilder, createAdvancedStore };
