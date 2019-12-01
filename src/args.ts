import { GetContainer } from "./container";
import { Model } from "./model";
import { assignObjectDeeply, merge, nothingToken } from "./util";

export const argsObjectKeyToken: unique symbol = "@@REDUX_ADVANCED_ARGS_OBJECT_KEY" as any;
export const requiredArgToken: unique symbol = "@@REDUX_ADVANCED_REQUIRED_ARG" as any;

export interface ArgsContext<TDependencies = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getContainer: GetContainer;

  required: CreateRequiredArg;
}

export type ArgsFactory<TDependencies, TArgs extends object> = (
  context: ArgsContext<TDependencies>
) => TArgs;

export type RequiredArg<T = any> = [
  typeof requiredArgToken,
  T | typeof nothingToken
];
export type ExtractRequiredArgType<T> = T extends RequiredArg<infer TType>
  ? TType
  : never;

export type ModelArgs<TArgs> = Pick<
  { [P in keyof TArgs]: ExtractRequiredArgType<TArgs[P]> },
  {
    [P in keyof TArgs]: TArgs[P] extends RequiredArg ? P : never;
  }[keyof TArgs]
> &
  Partial<
    Pick<
      TArgs,
      {
        [P in keyof TArgs]: TArgs[P] extends RequiredArg ? never : P;
      }[keyof TArgs]
    >
  >;

export type StateArgs<TArgs> = TArgs extends object
  ? TArgs extends { [argsObjectKeyToken]?: infer TArgsObject | undefined }
    ? Required<Pick<TArgs, Exclude<keyof TArgs, keyof TArgsObject>>> &
        Required<
          Pick<
            {
              [P in keyof TArgs]: P extends keyof TArgsObject
                ? StateArgs<TArgs[P]>
                : never;
            },
            Extract<keyof TArgsObject, keyof TArgs>
          >
        >
    : Required<TArgs>
  : TArgs;

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

export type CreateRequiredArg = <T>(defaultValue?: T) => RequiredArg<T>;
export const createRequiredArg: CreateRequiredArg = (...args) => [
  requiredArgToken,
  args.length > 0 ? args[0]! : nothingToken,
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

  assignObjectDeeply(result, result, (value, paths) => {
    if (isRequiredArg(value)) {
      if (optional) {
        value = value[1];
        if (value === nothingToken) {
          throw new Error(
            `Failed to generate args: arg "${paths.join(
              "."
            )}" has no default value`
          );
        }
        return value;
      } else {
        throw new Error(
          `Failed to generate args: arg "${paths.join(".")}" is required`
        );
      }
    }
  });

  return result;
}
