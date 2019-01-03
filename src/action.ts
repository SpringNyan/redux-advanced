import { Dispatch } from "redux";

import { Effect, Effects } from "./effect";
import { Reducer, Reducers } from "./reducer";

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

export interface ActionHelpers {
  [name: string]: ActionHelper;
}

export type ExtractActionPayload<
  T extends Action | Reducer | Effect
> = T extends
  | Action<infer TPayload>
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

export const actionEffectDispatchHandlerMap = new Map<
  AnyAction,
  {
    hasEffect: boolean;
    resolve: () => void;
    reject: (err: unknown) => void;
  }
>();

export class ActionHelperImpl<TPayload> implements ActionHelper<TPayload> {
  constructor(
    public readonly type: string,
    private readonly _defaultDispatch: Dispatch
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

  public dispatch(payload: TPayload, dispatch?: Dispatch): Promise<void> {
    const action = this.create(payload);
    if (dispatch == null) {
      dispatch = this._defaultDispatch;
    }

    const promise = new Promise<void>((resolve, reject) => {
      actionEffectDispatchHandlerMap.set(action, {
        hasEffect: false,
        resolve: () => {
          resolve();
          actionEffectDispatchHandlerMap.delete(action);
        },
        reject: (err) => {
          reject(err);
          actionEffectDispatchHandlerMap.delete(action);
        }
      });
    });

    dispatch(action);

    Promise.resolve().then(() => {
      const handler = actionEffectDispatchHandlerMap.get(action);
      if (handler != null && !handler.hasEffect) {
        handler.resolve();
      }
    });

    return promise;
  }
}
