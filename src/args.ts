import { Model } from "./model";
import { nil } from "./util";

export interface ArgsContext<TDependencies extends object | undefined = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  required: ArgsRequired;
}

export type ArgsFactory<
  TDependencies extends object | undefined,
  TArgs extends object | undefined
> = (context: ArgsContext<TDependencies>) => TArgs;

export type ExtractArgs<T extends Model> = T extends Model<
  any,
  infer TArgs,
  any,
  any,
  any,
  any,
  any
>
  ? TArgs
  : never;

export interface RequiredArg<T = any> {
  [nil]: "RequiredArg";
  type: T;
}

export type ArgsRequired = <T>() => RequiredArg<T>;

export type ToArgs<T> = Pick<
  { [P in keyof T]: T[P] extends RequiredArg ? T[P]["type"] : never },
  { [P in keyof T]: T[P] extends RequiredArg ? P : never }[keyof T]
> &
  Partial<
    Pick<T, { [P in keyof T]: T[P] extends RequiredArg ? never : P }[keyof T]>
  >;

export const argsRequired: ArgsRequired = () => nil as any;
