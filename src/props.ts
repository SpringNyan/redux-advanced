import { Model } from "./model";

export interface PropsContext<TDependencies extends object | undefined = any> {
  dependencies: TDependencies;
  key: string;
}

export type PropsFactory<
  TDependencies extends object | undefined,
  TProps extends object | undefined
> = (context: PropsContext<TDependencies>) => TProps;

export type ExtractProps<T extends Model> = T extends Model<
  any,
  infer TProps,
  any,
  any,
  any,
  any
>
  ? TProps
  : never;
