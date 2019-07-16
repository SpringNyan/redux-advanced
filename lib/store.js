import { applyMiddleware, createStore } from "redux";
import { createEpicMiddleware } from "redux-observable";
import { mergeMap } from "rxjs/operators";
import { createStoreContext } from "./context";
import { createMiddleware } from "./middleware";
import { createRegisterModels } from "./model";
import { createReduxReducer } from "./reducer";
export function init(options) {
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
