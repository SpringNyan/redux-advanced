import { GetContainer } from "./container";
import { Model } from "./model";
export interface ArgsContext<TDependencies = any> {
    dependencies: TDependencies;
    namespace: string;
    key: string | undefined;
    getContainer: GetContainer;
    required: RequiredArgFunc;
}
export declare type ArgsFactory<TDependencies, TArgs extends object> = (context: ArgsContext<TDependencies>) => TArgs;
export declare type ExtractArgs<T extends Model> = T extends Model<any, infer TArgs, any, any, any, any, any> ? TArgs : never;
export declare const requiredArgToken: unique symbol;
export declare type RequiredArg<T = any> = [typeof requiredArgToken, T | undefined];
export declare type RequiredArgFunc = <T>(fakeValue?: T) => RequiredArg<T>;
export declare type ExtractRequiredArgType<T extends RequiredArg> = T extends RequiredArg<infer TType> ? TType : never;
export declare type ToArgs<T> = Pick<{
    [P in keyof T]: T[P] extends RequiredArg ? ExtractRequiredArgType<T[P]> : never;
}, {
    [P in keyof T]: T[P] extends RequiredArg ? P : never;
}[keyof T]> & Partial<Pick<T, {
    [P in keyof T]: T[P] extends RequiredArg ? never : P;
}[keyof T]>>;
export declare const requiredArgFunc: RequiredArgFunc;
export declare function isRequiredArg(obj: any): obj is RequiredArg;
export declare function generateArgs(model: Model, context: ArgsContext, args: object | undefined, optional?: boolean): any;
