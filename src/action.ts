import { Dispatch } from "redux";

import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { Effect, Effects, ExtractEffectResult, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
import {
  joinLastPart,
  mapObjectDeeply,
  merge,
  PatchedPromise,
  splitLastPart
} from "./util";

export const actionTypes = {
  register: "@@REGISTER",
  unregister: "@@UNREGISTER",
  reload: "@@RELOAD"
};

export interface AnyAction {
  type: string;
  payload?: any;
}

export interface Action<TPayload = any> {
  type: string;
  payload: TPayload;
}

export interface ActionHelper<TPayload = any, TResult = any> {
  type: string;
  is(action: any): action is Action<TPayload>;
  create(payload: TPayload): Action<TPayload>;
  dispatch(payload: TPayload, dispatch?: Dispatch): Promise<TResult>;
}

export interface ActionHelpers {
  [name: string]: ActionHelper | ActionHelpers;
}

export type ExtractActionPayload<
  T extends Action | ActionHelper | Reducer | Effect
> = T extends
  | Action<infer TPayload>
  | ActionHelper<infer TPayload, any>
  | Reducer<any, any, infer TPayload>
  | Effect<any, any, any, any, infer TPayload, any>
  ? TPayload
  : never;

export type ExtractActionHelperResult<
  T extends ActionHelper
> = T extends ActionHelper<any, infer TResult> ? TResult : never;

export type ExtractActionHelperPayloadResultPairFromReducers<
  TReducers extends Reducers
> = {
  [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any
    ? [ExtractActionPayload<TReducers[P]>]
    : TReducers[P] extends {}
    ? ExtractActionHelperPayloadResultPairFromReducers<TReducers[P]>
    : never
};

export type ExtractActionHelperPayloadResultPairFromEffects<
  TEffects extends Effects
> = {
  [P in keyof TEffects]: TEffects[P] extends (...args: any[]) => any
    ? [ExtractActionPayload<TEffects[P]>, ExtractEffectResult<TEffects[P]>]
    : TEffects[P] extends {}
    ? ExtractActionHelperPayloadResultPairFromEffects<TEffects[P]>
    : never
};

export type ExtractActionHelpersFromPayloadResultPairObject<T> = {
  [P in keyof T]: T[P] extends any[]
    ? ActionHelper<T[P][0], T[P][1]>
    : T[P] extends {}
    ? ExtractActionHelpersFromPayloadResultPairObject<T[P]>
    : never
};

export type ExtractActionHelpersFromReducersEffects<
  TReducers extends Reducers,
  TEffects extends Effects
> = ExtractActionHelpersFromPayloadResultPairObject<
  ExtractActionHelperPayloadResultPairFromReducers<TReducers> &
    ExtractActionHelperPayloadResultPairFromEffects<TEffects>
>;

export class ActionHelperImpl<TPayload = any, TResult = any>
  implements ActionHelper<TPayload, TResult> {
  constructor(
    private readonly _storeContext: StoreContext,
    private readonly _container: ContainerImpl,
    public readonly type: string
  ) {}

  public is(action: any): action is Action<TPayload> {
    return action != null && action.type === this.type;
  }

  public create(payload: TPayload): Action<TPayload> {
    return {
      type: this.type,
      payload
    };
  }

  public dispatch(payload: TPayload, dispatch?: Dispatch): Promise<TResult> {
    const action = this.create(payload);

    const promise = new PatchedPromise<TResult>((resolve, reject) => {
      this._storeContext.contextByAction.set(action, {
        container: this._container,
        deferred: {
          resolve,
          reject: (reason) => {
            reject(reason);
            Promise.resolve().then(() => {
              if (
                !promise.hasRejectionHandler &&
                this._storeContext.options.defaultEffectErrorHandler
              ) {
                promise.catch(
                  this._storeContext.options.defaultEffectErrorHandler
                );
              }
            });
          }
        }
      });
    });

    (dispatch || this._storeContext.store.dispatch)(action);

    return promise;
  }
}

export function createActionHelpers<TModel extends Model>(
  storeContext: StoreContext,
  container: ContainerImpl<TModel>
): ExtractActionHelpersFromReducersEffects<
  ExtractReducers<TModel>,
  ExtractEffects<TModel>
> {
  const actionHelpers: ActionHelpers = {};

  mapObjectDeeply(
    actionHelpers,
    merge({}, container.model.reducers, container.model.effects),
    (obj, paths) =>
      new ActionHelperImpl(
        storeContext,
        container,
        joinLastPart(
          container.namespace,
          storeContext.options.resolveActionName!(paths)
        )
      )
  );

  return actionHelpers as any;
}

export interface RegisterPayload {
  namespace?: string;
  model?: number;
  args?: any;
  state?: any;
}

export interface UnregisterPayload {
  namespace?: string;
}

export interface ReloadPayload {
  state?: any;
}

export const batchRegisterActionHelper = new ActionHelperImpl<
  RegisterPayload[],
  void
>(undefined!, undefined!, actionTypes.register);

export const batchUnregisterActionHelper = new ActionHelperImpl<
  UnregisterPayload[],
  void
>(undefined!, undefined!, actionTypes.unregister);

export const reloadActionHelper = new ActionHelperImpl<ReloadPayload, void>(
  undefined!,
  undefined!,
  actionTypes.reload
);

export function parseBatchRegisterPayloads(
  action: AnyAction
): RegisterPayload[] | null {
  if (batchRegisterActionHelper.is(action)) {
    return action.payload || [];
  }

  const [namespace, actionName] = splitLastPart(action.type);
  if (actionName === actionTypes.register) {
    return [{ ...action.payload, namespace }];
  }

  return null;
}

export function parseBatchUnregisterPayloads(
  action: AnyAction
): UnregisterPayload[] | null {
  if (batchUnregisterActionHelper.is(action)) {
    return action.payload || [];
  }

  const [namespace, actionName] = splitLastPart(action.type);
  if (actionName === actionTypes.unregister) {
    return [{ ...action.payload, namespace }];
  }

  return null;
}

export function createRegisterActionHelper(
  namespace: string
): ActionHelper<RegisterPayload, void> {
  return new ActionHelperImpl(
    undefined!,
    undefined!,
    joinLastPart(namespace, actionTypes.register)
  );
}

export function createUnregisterActionHelper(
  namespace: string
): ActionHelper<UnregisterPayload, void> {
  return new ActionHelperImpl(
    undefined!,
    undefined!,
    joinLastPart(namespace, actionTypes.unregister)
  );
}
