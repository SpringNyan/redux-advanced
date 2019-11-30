import { GetContainer } from "./container";
import { Model } from "./model";
import { assignObjectDeeply, merge, nothingToken } from "./util";

export const requiredArgToken: unique symbol = "@@REDUX_ADVANCED_REQUIRED_ARG" as any;

export interface ArgsContext<TDependencies = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getContainer: GetContainer;

  required: RequiredArgFactory;
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

export type ModelArgs<T> = T extends object
  ? Pick<
      { [P in keyof T]: ExtractRequiredArgType<T[P]> },
      { [P in keyof T]: T[P] extends RequiredArg ? P : never }[keyof T]
    > &
      Partial<
        Pick<
          {
            [P in keyof T]: T[P] extends ((...args: any[]) => any) | any[]
              ? T[P]
              : ModelArgs<T[P]>;
          },
          { [P in keyof T]: T[P] extends RequiredArg ? never : P }[keyof T]
        >
      >
  : T;
export type ExtractModelArgs<T extends Model> = T extends Model<
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

export type RequiredArgFactory = <T = undefined>(
  fakeValue?: T
) => RequiredArg<T>;

export const requiredArgFactory: RequiredArgFactory = (...args) => [
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
        return value[1] !== nothingToken ? value[1] : undefined;
      } else {
        throw new Error(
          `Failed to generate args: arg "${paths.join(".")}" is required`
        );
      }
    }
  });

  return result;
}
