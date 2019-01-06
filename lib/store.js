import { applyMiddleware, createStore } from "redux";
import { combineEpics, createEpicMiddleware } from "redux-observable";
import { BehaviorSubject } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { createStoreCache } from "./cache";
import { registerModels } from "./model";
import { createReduxRootReducer } from "./reducer";
export function createAdvancedStore(dependencies, models, options) {
    if (options == null) {
        options = {};
    }
    const storeCache = createStoreCache();
    storeCache.options = options;
    storeCache.dependencies = dependencies;
    registerModels(storeCache, "", models);
    const rootReducer = createReduxRootReducer(storeCache);
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
