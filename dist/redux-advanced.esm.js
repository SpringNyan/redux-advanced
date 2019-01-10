import { Observable, merge, BehaviorSubject } from 'rxjs';
import { mergeMap, catchError, takeUntil } from 'rxjs/operators';
import { createStore, applyMiddleware } from 'redux';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import produce from 'immer';

var actionTypes = {
    register: "@@REGISTER",
    epicEnd: "@@EPIC_END",
    unregister: "@@UNREGISTER"
};
var ActionHelperImpl = /** @class */ (function () {
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
function createActionHelpers(storeCache, namespace) {
    var namespaceCache = storeCache.cacheByNamespace[namespace];
    var actionHelpers = {};
    Object.keys(namespaceCache.model.reducers).concat(Object.keys(namespaceCache.model.effects)).forEach(function (key) {
        if (actionHelpers[key] == null) {
            actionHelpers[key] = new ActionHelperImpl(storeCache, namespace + "/" + key);
        }
    });
    return actionHelpers;
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
function createEffectsReduxObservableEpic(storeCache, namespace) {
    var namespaceCache = storeCache.cacheByNamespace[namespace];
    return function (rootAction$, rootState$) {
        var outputObservables = Object.keys(namespaceCache.model.effects).map(function (key) {
            var effect = namespaceCache.model.effects[key];
            var output$ = rootAction$.ofType(namespace + "/" + key).pipe(mergeMap(function (action) {
                var effectDispatchHandler = storeCache.effectDispatchHandlerByAction.get(action);
                if (effectDispatchHandler != null) {
                    effectDispatchHandler.hasEffect = true;
                }
                var effectDispatch = effect({
                    rootAction$: rootAction$,
                    rootState$: rootState$,
                    namespace: namespace,
                    dependencies: storeCache.dependencies,
                    props: namespaceCache.props,
                    key: namespaceCache.key,
                    getState: function () { return rootState$.value[namespaceCache.path]; },
                    getters: namespaceCache.container.getters,
                    actions: namespaceCache.container.actions,
                    useContainer: storeCache.useContainer
                }, action.payload);
                var wrappedEffectDispatch = function (dispatch) {
                    var promise = effectDispatch(dispatch);
                    promise.then(function () {
                        if (effectDispatchHandler != null) {
                            effectDispatchHandler.resolve();
                        }
                    }, function (err) {
                        if (effectDispatchHandler != null) {
                            effectDispatchHandler.reject(err);
                        }
                    });
                    return promise;
                };
                return toActionObservable(wrappedEffectDispatch);
            }));
            if (storeCache.options.epicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
            }
            return output$;
        });
        var takeUntil$ = rootAction$.ofType(namespace + "/" + actionTypes.unregister);
        return merge.apply(void 0, outputObservables).pipe(takeUntil(takeUntil$));
    };
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

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

// tslint:disable-next-line:ban-types
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
function createGetters(storeCache, namespace) {
    var namespaceCache = storeCache.cacheByNamespace[namespace];
    var getters = {};
    Object.keys(namespaceCache.model.selectors).forEach(function (key) {
        Object.defineProperty(getters, key, {
            get: function () {
                var selector = namespaceCache.model.selectors[key];
                var rootState = storeCache.getState();
                var state = rootState[namespaceCache.path];
                return selector({
                    dependencies: storeCache.dependencies,
                    props: namespaceCache.props,
                    key: namespaceCache.key,
                    state: state,
                    getters: getters,
                    actions: namespaceCache.container.actions,
                    useContainer: storeCache.useContainer
                }, namespaceCache.containerId);
            },
            enumerable: true,
            configurable: true
        });
    });
    return getters;
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

var ModelBuilder = /** @class */ (function () {
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
    ModelBuilder.prototype.autoRegister = function (value) {
        if (value === void 0) { value = true; }
        if (this._isFrozen) {
            return this.clone().autoRegister(value);
        }
        this._model.autoRegister = value;
        return this;
    };
    ModelBuilder.prototype.dependencies = function () {
        if (this._isFrozen) {
            return this.clone().dependencies();
        }
        return this;
    };
    ModelBuilder.prototype.props = function (defaultProps) {
        if (this._isFrozen) {
            return this.clone().props(defaultProps);
        }
        this._model.defaultProps = __assign({}, this._model.defaultProps, defaultProps);
        return this;
    };
    ModelBuilder.prototype.state = function (state) {
        if (this._isFrozen) {
            return this.clone().state(state);
        }
        var oldState = this._model.state;
        var newState = functionWrapper(state);
        this._model.state = function (context) { return (__assign({}, oldState(context), newState(context))); };
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
    ModelBuilder.prototype.build = function (props) {
        var model = cloneModel(this._model);
        if (props !== undefined) {
            model.defaultProps = props;
        }
        return model;
    };
    return ModelBuilder;
}());
function functionWrapper(obj) {
    return typeof obj === "function" ? obj : function () { return obj; };
}
function cloneModel(model) {
    return {
        defaultProps: __assign({}, model.defaultProps),
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
        model.state != null &&
        model.selectors != null &&
        model.reducers != null &&
        model.effects != null &&
        model.epics != null &&
        typeof model.state === "function");
}
function createModelBuilder() {
    return new ModelBuilder({
        defaultProps: {},
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

function createEpicsReduxObservableEpic(storeCache, namespace) {
    var namespaceCache = storeCache.cacheByNamespace[namespace];
    return function (rootAction$, rootState$) {
        var outputObservables = namespaceCache.model.epics.map(function (epic) {
            var output$ = epic({
                rootAction$: rootAction$,
                rootState$: rootState$,
                namespace: namespace,
                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                key: namespaceCache.key,
                getState: function () { return rootState$.value[namespaceCache.path]; },
                getters: namespaceCache.container.getters,
                actions: namespaceCache.container.actions,
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

var ContainerImpl = /** @class */ (function () {
    function ContainerImpl(_storeCache, _model, baseNamespace, _key) {
        this._storeCache = _storeCache;
        this._model = _model;
        this._key = _key;
        this._containerId = "" + ContainerImpl._nextContainerId;
        ContainerImpl._nextContainerId += 1;
        this.namespace = buildNamespace(baseNamespace, this._key);
        this._path = convertNamespaceToPath(this.namespace);
    }
    Object.defineProperty(ContainerImpl.prototype, "isRegistered", {
        get: function () {
            var cache = this._storeCache.cacheByNamespace[this.namespace];
            return cache != null && cache.model === this._model;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "canRegister", {
        get: function () {
            return this._storeCache.cacheByNamespace[this.namespace] == null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "state", {
        get: function () {
            if (this.canRegister && this._model.autoRegister) {
                this.register();
            }
            if (this.isRegistered) {
                return this._storeCache.getState()[this._path];
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "getters", {
        get: function () {
            if (this.canRegister && this._model.autoRegister) {
                this.register();
            }
            if (this.isRegistered) {
                if (this._cachedGetters == null) {
                    this._cachedGetters = createGetters(this._storeCache, this.namespace);
                }
                return this._cachedGetters;
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContainerImpl.prototype, "actions", {
        get: function () {
            if (this.canRegister && this._model.autoRegister) {
                this.register();
            }
            if (this.isRegistered) {
                if (this._cachedActions == null) {
                    this._cachedActions = createActionHelpers(this._storeCache, this.namespace);
                }
                return this._cachedActions;
            }
            throw new Error("container is not registered yet");
        },
        enumerable: true,
        configurable: true
    });
    ContainerImpl.prototype.register = function (props) {
        var _a = this._storeCache, cacheByNamespace = _a.cacheByNamespace, pendingNamespaces = _a.pendingNamespaces, store = _a.store, dispatch = _a.dispatch, addEpic$ = _a.addEpic$, initialEpics = _a.initialEpics;
        if (!this.canRegister) {
            throw new Error("namespace is already used");
        }
        if (props === undefined) {
            props = this._model.defaultProps;
        }
        cacheByNamespace[this.namespace] = {
            key: this._key,
            path: this._path,
            model: this._model,
            props: props,
            containerId: this._containerId,
            container: this
        };
        pendingNamespaces.push(this.namespace);
        var epic = combineEpics(createEffectsReduxObservableEpic(this._storeCache, this.namespace), createEpicsReduxObservableEpic(this._storeCache, this.namespace));
        if (store != null) {
            addEpic$.next(epic);
            dispatch({
                type: this.namespace + "/" + actionTypes.register
            });
        }
        else {
            initialEpics.push(epic);
        }
    };
    ContainerImpl.prototype.unregister = function () {
        var _this = this;
        var _a = this._storeCache, cacheByNamespace = _a.cacheByNamespace, dispatch = _a.dispatch;
        if (!this.isRegistered) {
            throw new Error("container is not registered yet");
        }
        dispatch({
            type: this.namespace + "/" + actionTypes.epicEnd
        });
        delete cacheByNamespace[this.namespace];
        dispatch({
            type: this.namespace + "/" + actionTypes.unregister
        });
        Object.keys(this._model.selectors).forEach(function (key) {
            var selector = _this._model.selectors[key];
            if (selector.__deleteCache != null) {
                selector.__deleteCache(_this._containerId);
            }
        });
        this._cachedActions = undefined;
        this._cachedGetters = undefined;
    };
    ContainerImpl._nextContainerId = 1;
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
            var cacheByNamespace = storeCache.cacheByNamespace, namespaceByModel = storeCache.namespaceByModel;
            if (!namespaceByModel.has(model)) {
                throw new Error("model is not registered yet");
            }
            var baseNamespace = namespaceByModel.get(model);
            var namespace = buildNamespace(baseNamespace, key);
            var namespaceCache = cacheByNamespace[namespace];
            if (namespaceCache == null || namespaceCache.model !== model) {
                return new ContainerImpl(storeCache, model, baseNamespace, key);
            }
            else {
                return namespaceCache.container;
            }
        },
        pendingNamespaces: [],
        effectDispatchHandlerByAction: new Map(),
        cacheByNamespace: {},
        namespaceByModel: new Map()
    };
    return storeCache;
}

function createReduxRootReducer(storeCache) {
    return function (rootState, action) {
        if (rootState === undefined) {
            rootState = {};
        }
        var initialRootState;
        storeCache.pendingNamespaces.forEach(function (_namespace) {
            var _namespaceCache = storeCache.cacheByNamespace[_namespace];
            if (_namespaceCache == null) {
                return;
            }
            if (rootState[_namespaceCache.path] === undefined) {
                var initialState = _namespaceCache.model.state({
                    dependencies: storeCache.dependencies,
                    props: _namespaceCache.props,
                    key: _namespaceCache.key
                });
                if (initialState !== undefined) {
                    if (initialRootState == null) {
                        initialRootState = {};
                    }
                    initialRootState[_namespaceCache.path] = initialState;
                }
            }
        });
        storeCache.pendingNamespaces = [];
        if (initialRootState != null) {
            rootState = __assign({}, rootState, initialRootState);
        }
        var actionType = "" + action.type;
        var _a = parseActionType(actionType), namespace = _a.namespace, key = _a.key;
        if (key === actionTypes.unregister) {
            rootState = __assign({}, rootState);
            delete rootState[convertNamespaceToPath(namespace)];
        }
        var namespaceCache = storeCache.cacheByNamespace[namespace];
        if (namespaceCache == null) {
            return rootState;
        }
        var reducer = namespaceCache.model.reducers[key];
        if (reducer == null) {
            return rootState;
        }
        return produce(rootState, function (draft) {
            reducer(draft[namespaceCache.path], action.payload, {
                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                key: namespaceCache.key,
                originalState: rootState[namespaceCache.path]
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
    var rootReducer = createReduxRootReducer(storeCache);
    storeCache.addEpic$ = new BehaviorSubject(combineEpics.apply(void 0, storeCache.initialEpics));
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
