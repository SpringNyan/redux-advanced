import { ConvertReducersAndEffectsToActionHelpers } from "./action";
import { ExtractEffects } from "./effect";
import { Model } from "./model";
import { ExtractReducers } from "./reducer";
import { ConvertSelectorsToGetters, ExtractSelectors } from "./selector";
import { ExtractState } from "./state";

export interface Container<TModel extends Model = any> {
  namespace: string;

  state: ExtractState<TModel>;
  getters: ConvertSelectorsToGetters<ExtractSelectors<TModel>>;
  actions: ConvertReducersAndEffectsToActionHelpers<
    ExtractReducers<TModel>,
    ExtractEffects<TModel>
  >;
}

export interface DynamicContainer<TModel extends Model = any>
  extends Container<TModel> {
  isRegistered: boolean;

  register(props?: ExtractProps<TModel>): void;
  unregister(): void;
}

export type ExtractDependencies<T extends Model> = T extends Model<
  infer TDependencies,
  any,
  any,
  any,
  any,
  any
>
  ? TDependencies
  : never;

export type ExtractProps<T extends Model> = T extends Model<
  any,
  infer TProps,
  any,
  any,
  any,
  any
>
  ? TProps
  : never;
