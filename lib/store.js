import { applyMiddleware, createStore } from "redux";
import { combineEpics, createEpicMiddleware } from "redux-observable";
import { BehaviorSubject } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { getStoreCache } from "./cache";
import { registerModels } from "./model";
import { createReduxRootReducer } from "./reducer";
let nextStoreId = 1;
export function createAdvancedStore(dependencies, models, options) {
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
