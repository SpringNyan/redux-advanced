import { Model } from "./model";

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
