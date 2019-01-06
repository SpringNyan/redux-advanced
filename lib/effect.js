import { merge, Observable } from "rxjs";
import { catchError, mergeMap, takeUntil } from "rxjs/operators";
import { actionTypes } from "./action";
export function toActionObservable(effectDispatch) {
    return new Observable((subscribe) => {
        const dispatch = (action) => {
            subscribe.next(action);
            return action;
        };
        effectDispatch(dispatch).then(() => subscribe.complete(), (reason) => subscribe.error(reason));
    });
}
export function createEffectsReduxObservableEpic(storeCache, namespace) {
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
