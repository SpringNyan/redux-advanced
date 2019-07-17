import * as tslib_1 from "tslib";
import { batchRegisterActionHelper } from "./action";
import { createSelector } from "./selector";
import { factoryWrapper, joinLastPart, mapObjectDeeply, merge } from "./util";
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
                    _a[namespace] = model.state(tslib_1.__assign({}, context, { args: (context.args || {})[namespace] })),
                    _a);
            };
            selectors = (_a = {},
                _a[namespace] = mapObjectDeeply({}, model.selectors, function (oldSelector) {
                    var newSelector = function (context, cache) {
                        return oldSelector(tslib_1.__assign({}, context, { state: (context.state || {})[namespace], getters: context.getters[namespace], actions: context.actions[namespace] }), cache);
                    };
                    return newSelector;
                }),
                _a);
            reducers = (_b = {},
                _b[namespace] = mapObjectDeeply({}, model.reducers, function (oldReducer) {
                    var newReducer = function (_state, payload, context) {
                        return oldReducer(_state[namespace], payload, tslib_1.__assign({}, context, { originalState: (context.originalState || {})[namespace] }));
                    };
                    return newReducer;
                }),
                _b);
            effects = (_c = {},
                _c[namespace] = mapObjectDeeply({}, model.effects, function (oldEffect) {
                    var newEffect = function (context, payload) {
                        return oldEffect(tslib_1.__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }), payload);
                    };
                    return newEffect;
                }),
                _c);
            epics = (_d = {},
                _d[namespace] = mapObjectDeeply({}, model.epics, function (oldEpic) {
                    var newEpic = function (context) {
                        return oldEpic(tslib_1.__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }));
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
export { ModelBuilder };
function cloneModel(model) {
    return {
        state: model.state,
        selectors: merge({}, model.selectors),
        reducers: merge({}, model.reducers),
        effects: merge({}, model.effects),
        epics: merge({}, model.epics)
    };
}
export function isModel(obj) {
    var model = obj;
    return model != null && typeof model.state === "function";
}
export function createModelBuilder() {
    return new ModelBuilder({
        state: function () { return undefined; },
        selectors: {},
        reducers: {},
        effects: {},
        epics: {}
    });
}
export function registerModel(storeContext, namespace, model) {
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
export function registerModels(storeContext, namespace, models) {
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
export function createRegisterModels(storeContext) {
    return function (models) {
        var payloads = registerModels(storeContext, "", models);
        storeContext.store.dispatch(batchRegisterActionHelper.create(payloads));
    };
}
