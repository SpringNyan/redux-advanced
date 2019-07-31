import { GetContainer } from "./container";
import { Model } from "./model";
import { mapObjectDeeply, merge, nil } from "./util";

export interface ArgsContext<TDependencies extends object | undefined = any> {
  dependencies: TDependencies;
  namespace: string;
  key: string | undefined;

  getContainer: GetContainer;

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

export type RequiredArg<T = any> = [typeof nil, "RequiredArg", T | undefined];

export type ExtractRequiredArgType<
  T extends RequiredArg
> = T extends RequiredArg<infer TType> ? TType : never;

export type ArgsRequired = <T>(fakeValue?: T) => RequiredArg<T>;

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

export const argsRequired: ArgsRequired = (fakeValue) => [
  nil,
  "RequiredArg",
  fakeValue
];

export function isRequiredArg(obj: any): obj is RequiredArg {
  return Array.isArray(obj) && obj[0] === nil && obj[1] === "RequiredArg";
}

export function generateArgs(
  model: Model,
  context: ArgsContext,
  args: object | undefined,
  optional?: boolean
) {
  const result = model.args(context);

  if (result !== undefined) {
    if (args !== undefined) {
      merge(result, args);
    }

    mapObjectDeeply(result, result, (value) => {
      if (isRequiredArg(value)) {
        if (optional) {
          return value[2];
        } else {
          throw new Error("arg is required");
        }
      }
    });
  }

  return result;
}
