import { GetContainer } from "./container";
import { Model } from "./model";
import { mapObjectDeeply, merge } from "./util";

export interface ArgsContext<TDependencies = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getContainer: GetContainer;

  required: RequiredArgFunc;
}

export type ArgsFactory<TDependencies, TArgs extends object> = (
  context: ArgsContext<TDependencies>
) => TArgs;

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

export const requiredArgToken: unique symbol = `@@REQUIRED_ARG__${Date.now()}` as any;

export type RequiredArg<T = any> = [typeof requiredArgToken, T | undefined];
export type RequiredArgFunc = <T>(fakeValue?: T) => RequiredArg<T>;

export type ExtractRequiredArgType<
  T extends RequiredArg
> = T extends RequiredArg<infer TType> ? TType : never;

export type ToArgs<T> = Pick<
  {
    [P in keyof T]: T[P] extends RequiredArg
      ? ExtractRequiredArgType<T[P]>
      : never
  },
  { [P in keyof T]: T[P] extends RequiredArg ? P : never }[keyof T]
> &
  Partial<
    Pick<T, { [P in keyof T]: T[P] extends RequiredArg ? never : P }[keyof T]>
  >;

export const requiredArgFunc: RequiredArgFunc = (fakeValue) => [
  requiredArgToken,
  fakeValue
];

export function isRequiredArg(obj: any): obj is RequiredArg {
  return Array.isArray(obj) && obj[0] === requiredArgToken;
}

export function generateArgs(
  model: Model,
  context: ArgsContext,
  args: object | undefined,
  optional?: boolean
) {
  const result = model.args(context);

  if (args !== undefined) {
    merge(result, args);
  }

  mapObjectDeeply(result, result, (value) => {
    if (isRequiredArg(value)) {
      if (optional) {
        return value[1];
      } else {
        throw new Error("arg is required");
      }
    }
  });

  return result;
}
