import { Model } from "./model";
import { nil } from "./util";
export interface ArgsContext<TDependencies extends object | undefined = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    required: ArgsRequired;
}
export declare type ArgsFactory<TDependencies extends object | undefined, TArgs extends object | undefined> = (context: ArgsContext<TDependencies>) => TArgs;
export declare type ExtractArgs<T extends Model> = T extends Model<any, infer TArgs, any, any, any, any, any> ? TArgs : never;
export declare type RequiredArg<T = any> = [typeof nil, "RequiredArg", T | undefined];
export declare type ExtractRequiredArgType<T extends RequiredArg> = T extends RequiredArg<infer TType> ? TType : never;
export declare type ArgsRequired = <T>(fakeValue?: T) => RequiredArg<T>;
export declare type ToArgs<T> = Pick<{
    [P in keyof T]: T[P] extends RequiredArg ? ExtractRequiredArgType<T[P]> : never;
}, {
    [P in keyof T]: T[P] extends RequiredArg ? P : never;
}[keyof T]> & Partial<Pick<T, {
    [P in keyof T]: T[P] extends RequiredArg ? never : P;
}[keyof T]>>;
export declare const argsRequired: ArgsRequired;
export declare function isRequiredArg(obj: any): obj is RequiredArg;
