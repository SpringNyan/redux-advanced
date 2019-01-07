import { merge } from "rxjs";
import { catchError, takeUntil } from "rxjs/operators";
import { actionTypes } from "./action";
export function createEpicsReduxObservableEpic(storeCache, namespace) {
    const namespaceCache = storeCache.cacheByNamespace[namespace];
    return (rootAction$, rootState$) => {
        const outputObservables = namespaceCache.model.epics.map((epic) => {
            let output$ = epic({
                rootAction$,
                rootState$,
                namespace,
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
