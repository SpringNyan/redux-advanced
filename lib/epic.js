import { merge } from "rxjs";
import { catchError, filter, takeUntil } from "rxjs/operators";
import { batchUnregisterActionHelper, createUnregisterActionHelper } from "./action";
import { mapObjectDeeply } from "./util";
export function createReduxObservableEpic(storeContext, container) {
    return function (rootAction$, rootState$) {
        var outputObservables = [];
        mapObjectDeeply({}, container.model.epics, function (epic) {
            var output$ = epic({
                rootAction$: rootAction$,
                rootState$: rootState$,
                dependencies: storeContext.options.dependencies,
                namespace: container.namespace,
                key: container.key,
                getState: function () { return container.state; },
                getters: container.getters,
                actions: container.actions,
                getContainer: storeContext.getContainer
            });
            if (storeContext.options.defaultEpicErrorHandler != null) {
                output$ = output$.pipe(catchError(storeContext.options.defaultEpicErrorHandler));
            }
            outputObservables.push(output$);
        });
        var unregisterActionType = createUnregisterActionHelper(container.namespace).type;
        var takeUntil$ = rootAction$.pipe(filter(function (action) {
            if (action.type === unregisterActionType) {
                return true;
            }
            if (batchUnregisterActionHelper.is(action)) {
                return (action.payload || []).some(function (payload) { return payload.namespace === container.namespace; });
            }
            return false;
        }));
        return merge.apply(void 0, outputObservables).pipe(takeUntil(takeUntil$));
    };
}
