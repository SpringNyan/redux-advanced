import { Dispatch } from "redux";

import { StoreCache } from "./cache";
import { Effect, Effects, ExtractEffectResult, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";

import { ContainerImpl } from "./container";
import { flattenNestedFunctionMap, merge, PatchedPromise } from "./util";

export const actionTypes = {
  register: "@@REGISTER",
  willUnregister: "@@WILL_UNREGISTER",
  unregister: "@@UNREGISTER"
};

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
  dispatch(payload: TPayload, dispatch?: Dispatch): Promise<TResult>;
}

export interface ActionHelpers {
  [name: string]: ActionHelper | ActionHelpers;
}

export type ExtractActionPayload<
  T extends Action | ActionHelper | Reducer | Effect
> = T extends
  | Action<infer TPayload>
  | ActionHelper<infer TPayload>
  | Reducer<any, any, any, infer TPayload>
  | Effect<any, any, any, any, any, infer TPayload>
  ? TPayload
  : never;

export type ExtractActionHelperResult<
  T extends ActionHelper
> = T extends ActionHelper<any, infer TResult> ? TResult : never;

export type ExtractActionHelperPayloadResultInfoFromReducers<
  TReducers extends Reducers
> = {
  [P in keyof TReducers]: TReducers[P] extends (...args: any[]) => any
    ? [ExtractActionPayload<TReducers[P]>]
    : TReducers[P] extends {}
    ? ExtractActionHelperPayloadResultInfoFromReducers<TReducers[P]>
    : never
};

export type ExtractActionHelperPayloadResultInfoFromEffects<
  TEffects extends Effects
> = {
  [P in keyof TEffects]: TEffects[P] extends (...args: any[]) => any
    ? [ExtractActionPayload<TEffects[P]>, ExtractEffectResult<TEffects[P]>]
    : TEffects[P] extends {}
    ? ExtractActionHelperPayloadResultInfoFromEffects<TEffects[P]>
    : never
};

export type ConvertActionHelperPayloadResultInfoToActionHelpers<T> = {
  [P in keyof T]: T[P] extends any[]
    ? ActionHelper<T[P][0], T[P][1]>
    : T[P] extends {}
    ? ConvertActionHelperPayloadResultInfoToActionHelpers<T[P]>
    : never
};

export type ConvertReducersAndEffectsToActionHelpers<
  TReducers extends Reducers,
  TEffects extends Effects
> = ConvertActionHelperPayloadResultInfoToActionHelpers<
  ExtractActionHelperPayloadResultInfoFromReducers<TReducers> &
    ExtractActionHelperPayloadResultInfoFromEffects<TEffects>
>;

export class ActionHelperImpl<TPayload, TResult>
  implements ActionHelper<TPayload, TResult> {
  public readonly type: string;

  constructor(
    private readonly _storeCache: StoreCache,
    private readonly _container: ContainerImpl<Model>,
    private readonly _actionName: string
  ) {
    this.type = `${this._container.namespace}/${this._actionName}`;
  }

  public is = (action: any): action is Action<TPayload> => {
    return action != null && action.type === this.type;
  };

  public create = (payload: TPayload): Action<TPayload> => {
    const action = {
      type: this.type,
      payload
    };

    this._storeCache.contextByAction.set(action, {
      model: this._container.model,
      key: this._container.key
    });

    return action;
  };

  public dispatch = (
    payload: TPayload,
    dispatch?: Dispatch
  ): Promise<TResult> => {
    const action = this.create(payload);
    if (dispatch == null) {
      dispatch = this._storeCache.dispatch;
    }

    const promise = new PatchedPromise<TResult>((resolve, reject) => {
      const context = this._storeCache.contextByAction.get(action);
      if (context != null) {
        context.effectDeferred = {
          resolve,
          reject: (reason) => {
            setTimeout(() => {
              if (
                !promise.rejectionHandled &&
                this._storeCache.options.effectErrorHandler != null
              ) {
                this._storeCache.options.effectErrorHandler(reason);
              }
            }, 0);

            return reject(reason);
          }
        };
      }
    });

    dispatch(action);

    // TODO: handle [Symbol.toStringTag]
    return (promise as PromiseLike<TResult>) as Promise<TResult>;
  };
}

export function createActionHelpers<TModel extends Model>(
  storeCache: StoreCache,
  container: ContainerImpl<TModel>
): ConvertReducersAndEffectsToActionHelpers<
  ExtractReducers<TModel>,
  ExtractEffects<TModel>
> {
  const actionHelpers: ActionHelpers = {};

  flattenNestedFunctionMap(
    // TODO: check conflict
    merge({}, container.model.reducers, container.model.effects)
  ).forEach(({ paths }) => {
    let obj = actionHelpers;
    paths.forEach((path, index) => {
      if (index === paths.length - 1) {
        obj[path] = new ActionHelperImpl(
          storeCache,
          container,
          storeCache.options.resolveActionName!(paths)
        );
      } else {
        if (obj[path] == null) {
          obj[path] = {};
        }
        obj = obj[path] as ActionHelpers;
      }
    });
  });

  return actionHelpers as any;
}
