import { Dispatch } from "redux";

import { StoreCache } from "./cache";
import { Effect, Effects, ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers, Reducer, Reducers } from "./reducer";
import { Override } from "./util";

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

export interface ActionHelper<TPayload = any> {
  type: string;
  is(action: any): action is Action<TPayload>;
  create(payload: TPayload): Action<TPayload>;
  dispatch(payload: TPayload, dispatch?: Dispatch): Promise<void>;
}

export type StrictActionHelper<TPayload = any> = Override<
  ActionHelper<TPayload>,
  {
    dispatch(payload: TPayload, dispatch: Dispatch): Promise<void>;
  }
>;

export interface ActionHelpers {
  [name: string]: ActionHelper;
}

export type ConvertActionHelpersToStrictActionHelpers<
  TActionHelpers extends ActionHelpers
> = {
  [P in keyof TActionHelpers]: StrictActionHelper<
    ExtractActionPayload<TActionHelpers[P]>
  >
};

export type ExtractActionPayload<
  T extends Action | ActionHelper | Reducer | Effect
> = T extends
  | Action<infer TPayload>
  | ActionHelper<infer TPayload>
  | Reducer<any, any, any, infer TPayload>
  | Effect<any, any, any, any, any, infer TPayload>
  ? TPayload
  : never;

export type ExtractActionPayloads<T extends Reducers | Effects> = {
  [P in keyof T]: ExtractActionPayload<T[P]>
};

export type ConvertPayloadsToActionHelpers<TPayloads> = {
  [P in keyof TPayloads]: ActionHelper<TPayloads[P]>
};

export type ConvertReducersAndEffectsToActionHelpers<
  TReducers extends Reducers,
  TEffects extends Effects
> = ConvertPayloadsToActionHelpers<
  ExtractActionPayloads<TReducers> & ExtractActionPayloads<TEffects>
>;

export class ActionHelperImpl<TPayload> implements ActionHelper<TPayload> {
  constructor(
    private readonly _storeCache: StoreCache,
    public readonly type: string
  ) {}

  public is = (action: any): action is Action<TPayload> => {
    return action != null && action.type === this.type;
  };

  public create = (payload: TPayload): Action<TPayload> => {
    return {
      type: this.type,
      payload
    };
  };

  public dispatch = (payload: TPayload, dispatch?: Dispatch): Promise<void> => {
    const action = this.create(payload);
    if (dispatch == null) {
      dispatch = this._storeCache.dispatch;
    }

    const promise = new Promise<void>((resolve, reject) => {
      this._storeCache.effectDispatchHandlerByAction.set(action, {
        hasEffect: false,
        resolve: () => {
          resolve();
          this._storeCache.effectDispatchHandlerByAction.delete(action);
        },
        reject: (err) => {
          reject(err);
          this._storeCache.effectDispatchHandlerByAction.delete(action);
        }
      });
    });

    dispatch(action);

    Promise.resolve().then(() => {
      const handler = this._storeCache.effectDispatchHandlerByAction.get(
        action
      );
      if (handler != null && !handler.hasEffect) {
        handler.resolve();
      }
    });

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
    if (!(key in actionHelpers)) {
      const actionHelper = new ActionHelperImpl(
        storeCache,
        `${container.namespace}/${key}`
      );

      Object.defineProperty(actionHelpers, key, {
        get() {
          if (container.canRegister && container.model.autoRegister) {
            container.register();
          }

          return actionHelper;
        },
        enumerable: true,
        configurable: true
      });
    }
  });

  return actionHelpers as any;
}
