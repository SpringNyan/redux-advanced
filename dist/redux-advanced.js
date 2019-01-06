import { merge, Observable, BehaviorSubject } from 'rxjs';
import { catchError, takeUntil, mergeMap } from 'rxjs/operators';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import { createStore, applyMiddleware } from 'redux';
import produce from 'immer';

function createEpicsReduxObservableEpic(storeId, namespace) {
    const storeCache = getStoreCache(storeId);
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    return (rootAction$, rootState$) => {
        const outputObservables = namespaceCache.model.epics.map((epic) => {
            let output$ = epic({
                rootAction$,
                rootState$,
                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                getters: namespaceCache.container.getters,
                actions: namespaceCache.container.actions,
                useContainer: storeCache.useContainer,
                getState: () => rootState$.value[namespaceCache.path]
            });
            if (storeCache.options.epicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeCache.options.epicErrorHandler));
            }
            return output$;
        });
        const takeUntil$ = rootAction$.ofType(`${namespace}/${actionTypes.unregister}`);
        return merge(...outputObservables).pipe(takeUntil(takeUntil$));
    };
}

// tslint:disable-next-line:ban-types
const createSelector = ((...args) => {
    const selectors = args.slice(0, args.length - 1);
    const combiner = args[args.length - 1];
    const cacheById = {};
    const resultSelector = (context, cacheId) => {
        if (cacheId == null) {
            cacheId = 0;
        }
        if (cacheById[cacheId] == null) {
            cacheById[cacheId] = {
                cachedDependencies: undefined,
                cachedValue: undefined
            };
        }
        const cache = cacheById[cacheId];
        let needUpdate = false;
        const dependencies = selectors.map((selector) => selector(context));
        if (cache.cachedDependencies == null ||
            dependencies.some((dep, index) => dep !== cache.cachedDependencies[index])) {
            needUpdate = true;
        }
        if (needUpdate) {
            cache.cachedDependencies = dependencies;
            cache.cachedValue = combiner(...dependencies, context);
        }
        return cache.cachedValue;
    };
    resultSelector.__deleteCache = (cacheId) => {
        delete cacheById[cacheId];
    };
    return resultSelector;
});
function createGetters(storeId, namespace) {
    const storeCache = getStoreCache(storeId);
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    const getters = {};
    Object.keys(namespaceCache.model.selectors).forEach((key) => {
        Object.defineProperty(getters, key, {
            get() {
                const selector = namespaceCache.model.selectors[key];
                const rootState = storeCache.getState();
                const state = rootState[namespaceCache.path];
                return selector({
                    dependencies: storeCache.dependencies,
                    props: namespaceCache.props,
                    state,
                    getters,
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

const namespaceSplitterRegExp = new RegExp("/", "g");
function convertNamespaceToPath(namespace) {
    return namespace.replace(namespaceSplitterRegExp, ".");
}
function parseActionType(type) {
    const lastSplitterIndex = type.lastIndexOf("/");
    const namespace = type.substring(0, lastSplitterIndex);
    const key = type.substring(lastSplitterIndex + 1);
    return { namespace, key };
}
function buildNamespace(baseNamespace, key) {
    if (baseNamespace === "") {
        return key;
    }
    if (key === "") {
        return baseNamespace;
    }
    return `${baseNamespace}/${key}`;
}

class ContainerImpl {
    constructor(_storeId, namespace, _model) {
        this._storeId = _storeId;
        this.namespace = namespace;
        this._model = _model;
        this._storeCache = getStoreCache(this._storeId);
        this._containerId = ContainerImpl._nextContainerId;
        ContainerImpl._nextContainerId += 1;
        this._path = convertNamespaceToPath(this.namespace);
    }
    get isRegistered() {
        const cache = this._storeCache.cacheByNamespace[this.namespace];
        return cache != null && cache.model === this._model;
    }
    get canRegister() {
        return this._storeCache.cacheByNamespace[this.namespace] == null;
    }
    get state() {
        if (this.isRegistered) {
            return this._storeCache.getState()[this._path];
        }
        return undefined;
    }
    get getters() {
        if (this.isRegistered) {
            if (this._cachedGetters == null) {
                this._cachedGetters = createGetters(this._storeId, this.namespace);
            }
            return this._cachedGetters;
        }
        return undefined;
    }
    get actions() {
        if (this.isRegistered) {
            if (this._cachedActions == null) {
                this._cachedActions = createActionHelpers(this._storeId, this.namespace);
            }
            return this._cachedActions;
        }
        return undefined;
    }
    register(props) {
        const { cacheByNamespace, pendingNamespaces, store, dispatch, addEpic$, initialEpics } = this._storeCache;
        if (!this.canRegister) {
            throw new Error("namespace is already used");
        }
        this._props = props === undefined ? this._model.defaultProps : props;
        cacheByNamespace[this.namespace] = {
            path: this._path,
            model: this._model,
            props: this._props,
            containerId: this._containerId,
            container: this
        };
        pendingNamespaces.push(this.namespace);
        const epic = combineEpics(createEffectsReduxObservableEpic(this._storeId, this.namespace), createEpicsReduxObservableEpic(this._storeId, this.namespace));
        if (store != null) {
            addEpic$.next(epic);
            dispatch({
                type: `${this.namespace}/${actionTypes.register}`
            });
        }
        else {
            initialEpics.push(epic);
        }
    }
    unregister() {
        const { cacheByNamespace, dispatch } = this._storeCache;
        if (!this.isRegistered) {
            throw new Error("container is not registered yet");
        }
        dispatch({
            type: `${this.namespace}/${actionTypes.epicEnd}`
        });
        delete cacheByNamespace[this.namespace];
        dispatch({
            type: `${this.namespace}/${actionTypes.unregister}`
        });
        Object.keys(this._model.selectors).forEach((key) => {
            const selector = this._model.selectors[key];
            if (selector.__deleteCache != null) {
                selector.__deleteCache(this._containerId);
            }
        });
    }
}
ContainerImpl._nextContainerId = 1;

const cacheByStoreId = {};
function getStoreCache(storeId) {
    if (cacheByStoreId[storeId] == null) {
        cacheByStoreId[storeId] = {
            store: undefined,
            options: undefined,
            dependencies: undefined,
            addEpic$: undefined,
            initialEpics: [],
            getState: (...args) => cacheByStoreId[storeId].store.getState(...args),
            dispatch: (...args) => cacheByStoreId[storeId].store.dispatch(...args),
            useContainer: (model, key) => {
                if (key == null) {
                    key = "";
                }
                const { cacheByNamespace, namespaceByModel } = cacheByStoreId[storeId];
                if (!namespaceByModel.has(model)) {
                    throw new Error("model is not registered yet");
                }
                const baseNamespace = namespaceByModel.get(model);
                const namespace = buildNamespace(baseNamespace, key);
                const namespaceCache = cacheByNamespace[namespace];
                if (namespaceCache == null || namespaceCache.model !== model) {
                    return new ContainerImpl(storeId, namespace, model);
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
    }
    return cacheByStoreId[storeId];
}

const actionTypes = {
    register: "@@REGISTER",
    epicEnd: "@@EPIC_END",
    unregister: "@@UNREGISTER"
};
class ActionHelperImpl {
    constructor(storeId, type) {
        this.type = type;
        this._storeCache = getStoreCache(storeId);
    }
    is(action) {
        return action != null && action.type === this.type;
    }
    create(payload) {
        return {
            type: this.type,
            payload
        };
    }
    dispatch(payload, dispatch) {
        const action = this.create(payload);
        if (dispatch == null) {
            dispatch = this._storeCache.dispatch;
        }
        const promise = new Promise((resolve, reject) => {
            this._storeCache.effectDispatchHandlerByAction.set(action, {
                hasEffect: false,
                resolve: () => {
                    resolve();
                    this._storeCache.effectDispatchHandlerByAction.delete(action);
                },
                reject: (err) => {
                    reject(err);
                    this._storeCache.effectDispatchHandlerByAction.delete(action);
                }
            });
        });
        dispatch(action);
        Promise.resolve().then(() => {
            const handler = this._storeCache.effectDispatchHandlerByAction.get(action);
            if (handler != null && !handler.hasEffect) {
                handler.resolve();
            }
        });
        return promise;
    }
}
function createActionHelpers(storeId, namespace) {
    const storeCache = getStoreCache(storeId);
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    const actionHelpers = {};
    [
        ...Object.keys(namespaceCache.model.reducers),
        ...Object.keys(namespaceCache.model.effects)
    ].forEach((key) => {
        if (actionHelpers[key] == null) {
            actionHelpers[key] = new ActionHelperImpl(storeId, `${namespace}/${key}`);
        }
    });
    return actionHelpers;
}

function toActionObservable(effectDispatch) {
    return new Observable((subscribe) => {
        const dispatch = (action) => {
            subscribe.next(action);
            return action;
        };
        effectDispatch(dispatch).then(() => subscribe.complete(), (reason) => subscribe.error(reason));
    });
}
function createEffectsReduxObservableEpic(storeId, namespace) {
    const storeCache = getStoreCache(storeId);
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    return (rootAction$, rootState$) => {
        const outputObservables = Object.keys(namespaceCache.model.effects).map((key) => {
            const effect = namespaceCache.model.effects[key];
            let output$ = rootAction$.ofType(`${namespace}/${key}`).pipe(mergeMap((action) => {
                const effectDispatchHandler = storeCache.effectDispatchHandlerByAction.get(action);
                if (effectDispatchHandler != null) {
                    effectDispatchHandler.hasEffect = true;
                }
                const effectDispatch = effect({
                    rootAction$,
                    rootState$,
                    dependencies: storeCache.dependencies,
                    props: namespaceCache.props,
                    getters: namespaceCache.container.getters,
                    actions: namespaceCache.container.actions,
                    useContainer: storeCache.useContainer,
                    getState: () => rootState$.value[namespaceCache.path]
                }, action.payload);
                const wrappedEffectDispatch = (dispatch) => {
                    const promise = effectDispatch(dispatch);
                    promise.then(() => {
                        if (effectDispatchHandler != null) {
                            effectDispatchHandler.resolve();
                        }
                    }, (err) => {
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
        const takeUntil$ = rootAction$.ofType(`${namespace}/${actionTypes.unregister}`);
        return merge(...outputObservables).pipe(takeUntil(takeUntil$));
    };
}

class ModelBuilder {
    constructor(model) {
        this._isFrozen = false;
        this._model = cloneModel(model);
    }
    freeze() {
        this._isFrozen = true;
        return this;
    }
    clone() {
        return new ModelBuilder(this._model);
    }
    dependencies() {
        if (this._isFrozen) {
            return this.clone().dependencies();
        }
        return this;
    }
    props(defaultProps) {
        if (this._isFrozen) {
            return this.clone().props(defaultProps);
        }
        this._model.defaultProps = {
            ...this._model.defaultProps,
            ...defaultProps
        };
        return this;
    }
    state(state) {
        if (this._isFrozen) {
            return this.clone().state(state);
        }
        const oldState = this._model.state;
        const newState = functionWrapper(state);
        this._model.state = (context) => ({
            ...oldState(context),
            ...newState(context)
        });
        return this;
    }
    selectors(selectors) {
        if (this._isFrozen) {
            return this.clone().selectors(selectors);
        }
        if (typeof selectors === "function") {
            selectors = selectors(createSelector);
        }
        this._model.selectors = {
            ...this._model.selectors,
            ...selectors
        };
        return this;
    }
    reducers(reducers) {
        if (this._isFrozen) {
            return this.clone().reducers(reducers);
        }
        this._model.reducers = {
            ...this._model.reducers,
            ...reducers
        };
        return this;
    }
    effects(effects) {
        if (this._isFrozen) {
            return this.clone().effects(effects);
        }
        this._model.effects = {
            ...this._model.effects,
            ...effects
        };
        return this;
    }
    epics(epics) {
        if (this._isFrozen) {
            return this.clone().epics(epics);
        }
        this._model.epics = [...this._model.epics, ...epics];
        return this;
    }
    build(props) {
        const model = cloneModel(this._model);
        if (props !== undefined) {
            model.defaultProps = props;
        }
        return model;
    }
}
function functionWrapper(obj) {
    return typeof obj === "function" ? obj : () => obj;
}
function cloneModel(model) {
    return {
        defaultProps: { ...model.defaultProps },
        state: model.state,
        selectors: { ...model.selectors },
        reducers: { ...model.reducers },
        effects: { ...model.effects },
        epics: [...model.epics]
    };
}
function isModel(obj) {
    const model = obj;
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
        state: () => ({}),
        selectors: {},
        reducers: {},
        effects: {},
        epics: []
    });
}
function registerModel(storeId, namespace, model) {
    const storeCache = getStoreCache(storeId);
    const models = Array.isArray(model) ? model : [model];
    models.forEach((_model) => {
        if (storeCache.namespaceByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        storeCache.namespaceByModel.set(_model, namespace);
    });
}
function registerModels(storeId, namespace, models) {
    const storeCache = getStoreCache(storeId);
    Object.keys(models).forEach((key) => {
        const model = models[key];
        const modelNamespace = buildNamespace(namespace, key);
        if (Array.isArray(model)) {
            registerModel(storeId, modelNamespace, model);
        }
        else if (isModel(model)) {
            registerModel(storeId, modelNamespace, model);
            storeCache.useContainer(model).register();
        }
        else {
            registerModels(storeId, modelNamespace, model);
        }
    });
}

function createReduxRootReducer(storeId) {
    const storeCache = getStoreCache(storeId);
    return (rootState, action) => {
        if (rootState === undefined) {
            rootState = {};
        }
        let initialRootState;
        storeCache.pendingNamespaces.forEach((_namespace) => {
            const _namespaceCache = storeCache.cacheByNamespace[_namespace];
            if (_namespaceCache == null) {
                return;
            }
            if (rootState[_namespaceCache.path] === undefined) {
                if (initialRootState == null) {
                    initialRootState = {};
                }
                initialRootState[_namespaceCache.path] = _namespaceCache.model.state({
                    dependencies: storeCache.dependencies,
                    props: _namespaceCache.props
                });
            }
        });
        storeCache.pendingNamespaces = [];
        if (initialRootState != null) {
            rootState = {
                ...rootState,
                ...initialRootState
            };
        }
        const actionType = "" + action.type;
        const { namespace, key } = parseActionType(actionType);
        if (key === actionTypes.unregister) {
            rootState = {
                ...rootState
            };
            delete rootState[convertNamespaceToPath(namespace)];
        }
        const namespaceCache = storeCache.cacheByNamespace[namespace];
        if (namespaceCache == null) {
            return rootState;
        }
        const reducer = namespaceCache.model.reducers[key];
        if (reducer == null) {
            return rootState;
        }
        return produce(rootState, (draft) => {
            reducer(draft[namespaceCache.path], action.payload, {
                dependencies: storeCache.dependencies,
                props: namespaceCache.props,
                originalState: rootState[namespaceCache.path]
            });
        });
    };
}

let nextStoreId = 1;
function createAdvancedStore(dependencies, models, options) {
    const storeId = nextStoreId;
    nextStoreId += 1;
    if (options == null) {
        options = {};
    }
    const storeCache = getStoreCache(storeId);
    storeCache.options = options;
    storeCache.dependencies = dependencies;
    registerModels(storeId, "", models);
    const rootReducer = createReduxRootReducer(storeId);
    storeCache.addEpic$ = new BehaviorSubject(combineEpics(...storeCache.initialEpics));
    const rootEpic = (action$, state$, epicDependencies) => storeCache.addEpic$.pipe(mergeMap((epic) => epic(action$, state$, epicDependencies)));
    if (options.createStore != null) {
        storeCache.store = options.createStore(rootReducer, rootEpic);
    }
    else {
        const epicMiddleware = createEpicMiddleware();
        storeCache.store = createStore(rootReducer, applyMiddleware(epicMiddleware));
        epicMiddleware.run(rootEpic);
    }
    const store = storeCache.store;
    store.useContainer = storeCache.useContainer;
    return store;
}

export { toActionObservable, createModelBuilder, createAdvancedStore };
