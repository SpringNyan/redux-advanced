import { Model } from "./model";
export declare type ExtractArgs<T extends Model> = T extends Model<any, infer TArgs, any, any, any, any, any> ? TArgs : never;
