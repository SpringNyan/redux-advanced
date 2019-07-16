import { Model } from "./model";
export declare type ExtractDependencies<T extends Model> = T extends Model<infer TDependencies, any, any, any, any, any, any> ? TDependencies : never;
