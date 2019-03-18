import { Dispatch } from "redux";

import { StoreCache } from "./cache";
import { Effect, Effects, ExtractEffectResult, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";

import { ContainerImpl } from "./container";

export const actionTypes = {
  register: "@@REGISTER",
  epicEnd: "@@EPIC_END",
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
  [name: string]: ActionHelper;
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

export type ExtractActionHelperPayloadResultPairsFromReducers<
  TReducers extends Reducers,
  TKeyOfUnknownResult
> = {
  [P in keyof TReducers]: {
    payload: ExtractActionPayload<TReducers[P]>;
    result: P extends TKeyOfUnknownResult ? unknown : void;
  }
};

export type ExtractActionHelperPayloadResultPairsFromEffects<
  TEffects extends Effects
> = {
  [P in keyof TEffects]: {
    payload: ExtractActionPayload<TEffects[P]>;
    result: ExtractEffectResult<TEffects[P]>;
  }
};

export type ConvertPayloadResultPairsToActionHelpers<
  T extends { [key: string]: { payload: unknown; result: unknown } }
> = { [P in keyof T]: ActionHelper<T[P]["payload"], T[P]["result"]> };

export type ConvertReducersAndEffectsToActionHelpers<
  TReducers extends Reducers,
  TEffects extends Effects
> = ConvertPayloadResultPairsToActionHelpers<
  ExtractActionHelperPayloadResultPairsFromReducers<
    TReducers,
    keyof TReducers & keyof TEffects
  > &
    ExtractActionHelperPayloadResultPairsFromEffects<TEffects>
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

    const promise = new Promise<TResult>((resolve, reject) => {
      const context = this._storeCache.contextByAction.get(action);
      if (context != null) {
        context.effectDeferred = {
          resolve: (value) => {
            resolve(value);
          },
          reject: (err) => {
            reject(err);
          }
        };
      }
    });

    dispatch(action);

    return promise;
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
  [
    ...Object.keys(container.model.reducers),
    ...Object.keys(container.model.effects)
  ].forEach((key) => {
    if (actionHelpers[key] == null) {
      actionHelpers[key] = new ActionHelperImpl(storeCache, container, key);
    }
  });

  return actionHelpers as any;
}
