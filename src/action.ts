import { Dispatch } from "redux";

import { ContainerImpl } from "./container";
import { StoreContext } from "./context";
import { Effect, Effects, ExtractEffectResult, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
import { joinLastPart, mapObjectDeeply, merge, PatchedPromise } from "./util";

export const actionTypes = {
  register: "@@REGISTER",
  registered: "@@REGISTERED",
  unregister: "@@UNREGISTER",
  unregistered: "@@UNREGISTERED"
};

export interface RegisterPayload {
  namespace?: string;
  model?: number;
  args?: any;
  state?: any;
}

export interface UnregisterPayload {
  namespace?: string;
}

export interface AnyAction {
  type: string;
}

export interface Action<TPayload = any> {
  type: string;
  payload: TPayload;
}

export interface ActionHelper<TPayload = any, TResult = any> {
  type: string;
  is(action: any): action is Action<TPayload>;
  create(payload: TPayload): Action<TPayload>;
  dispatch(payload: TPayload): Promise<TResult>;
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

export class ActionHelperImpl<TPayload, TResult>
  implements ActionHelper<TPayload, TResult> {
  constructor(
    private readonly _storeContext: StoreContext,
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
      this._storeContext.deferredByAction.set(action, {
        resolve,
        reject: (reason) => {
          setTimeout(() => {
            if (
              !promise.rejectionHandled &&
              this._storeContext.options.catchEffectError
            ) {
              promise.catch(this._storeContext.options.catchEffectError);
            }
          }, 0);

          return reject(reason);
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
        joinLastPart(
          container.namespace,
          storeContext.options.resolveActionName!(paths)
        )
      )
  );

  return actionHelpers as any;
}
