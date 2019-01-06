import { getStoreCache } from "./cache";
import { createSelector } from "./selector";
import { buildNamespace } from "./util";
export class ModelBuilder {
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
export function isModel(obj) {
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
export function createModelBuilder() {
    return new ModelBuilder({
        defaultProps: {},
        state: () => ({}),
        selectors: {},
        reducers: {},
        effects: {},
        epics: []
    });
}
export function registerModel(storeId, namespace, model) {
    const storeCache = getStoreCache(storeId);
    const models = Array.isArray(model) ? model : [model];
    models.forEach((_model) => {
        if (storeCache.namespaceByModel.has(_model)) {
            throw new Error("model is already registered");
        }
        storeCache.namespaceByModel.set(_model, namespace);
    });
}
export function registerModels(storeId, namespace, models) {
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
