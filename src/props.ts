import { Model } from "./model";

export interface PropsContext<TDependencies = any> {
  dependencies: TDependencies;
  key: string | undefined;
}

export type PropsFactory<TDependencies, TProps> = (
  context: PropsContext<TDependencies>
) => TProps;

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
