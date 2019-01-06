import { combineEpics } from "redux-observable";
import { createActionHelpers } from "./action";
import { actionTypes } from "./action";
import { createEffectsReduxObservableEpic } from "./effect";
import { createEpicsReduxObservableEpic } from "./epic";
import { createGetters } from "./selector";
import { convertNamespaceToPath } from "./util";
export class ContainerImpl {
    constructor(_storeCache, namespace, _model) {
        this._storeCache = _storeCache;
        this.namespace = namespace;
        this._model = _model;
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
                this._cachedGetters = createGetters(this._storeCache, this.namespace);
            }
            return this._cachedGetters;
        }
        return undefined;
    }
    get actions() {
        if (this.isRegistered) {
            if (this._cachedActions == null) {
                this._cachedActions = createActionHelpers(this._storeCache, this.namespace);
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
        const epic = combineEpics(createEffectsReduxObservableEpic(this._storeCache, this.namespace), createEpicsReduxObservableEpic(this._storeCache, this.namespace));
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
