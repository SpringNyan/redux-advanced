import * as tslib_1 from "tslib";
import { batchRegisterActionHelper } from "./action";
import { createSelector } from "./selector";
import { convertNamespaceToPath, factoryWrapper, joinLastPart, mapObjectDeeply, merge } from "./util";
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
                    _a[namespace] = model.args(tslib_1.__assign({}, context)),
                    _a);
            };
            state = function (context) {
                var _a;
                return (_a = {},
                    _a[namespace] = model.state(tslib_1.__assign({}, context, { args: (context.args || {})[namespace] })),
                    _a);
            };
            selectors = (_a = {},
                _a[namespace] = mapObjectDeeply({}, model.selectors, function (oldSelector) {
                    var newSelector = function (context, cache) {
                        return oldSelector(tslib_1.__assign({}, context, { getState: function () { return (context.getState() || {})[namespace]; }, getters: context.getters[namespace], actions: context.actions[namespace] }), cache);
                    };
                    return newSelector;
                }),
                _a);
            reducers = (_b = {},
                _b[namespace] = mapObjectDeeply({}, model.reducers, function (oldReducer) {
                    var newReducer = function (_state, payload, context) {
                        return oldReducer(_state[namespace], payload, tslib_1.__assign({}, context));
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
            options = tslib_1.__assign({}, options, { autoRegister: undefined });
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
export { ModelBuilder };
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
export function isModel(obj) {
    var model = obj;
    return model != null && typeof model.state === "function";
}
export function createModelBuilder() {
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
export function registerModel(storeContext, namespace, model) {
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
            payloads.push.apply(payloads, registerModels(storeContext, modelNamespace, model));
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
