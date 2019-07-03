export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends ((...args: any[]) => any) | any[]
    ? T[P]
    : DeepPartial<T[P]>
};

export const nil = {} as symbol;

import deepmerge from "deepmerge";
export function merge<T, U>(
  obj1: T | null | undefined,
  obj2: U | null | undefined
): T & U;
export function merge<T, U, V>(
  obj1: T | null | undefined,
  obj2: U | null | undefined,
  obj3: V | null | undefined
): T & U & V;
export function merge(...objs: any[]): any {
  objs = objs.map((obj) => (obj != null ? obj : {}));
  return deepmerge.all(objs);
}

const namespaceSplitterRegExp = new RegExp("/", "g");
export function convertNamespaceToPath(namespace: string): string {
  return namespace.replace(namespaceSplitterRegExp, ".");
}

export function parseActionType(
  type: string
): { namespace: string; actionName: string } {
  const lastSplitterIndex = type.lastIndexOf("/");
  const namespace = type.substring(0, lastSplitterIndex);
  const actionName = type.substring(lastSplitterIndex + 1);

  return { namespace, actionName };
}

export function buildNamespace(baseNamespace: string, key: string): string {
  if (key == null || key === "") {
    return baseNamespace;
  }

  if (baseNamespace === "") {
    return key;
  }

  return `${baseNamespace}/${key}`;
}

export function functionWrapper<T, U extends any[]>(
  obj: T | ((...args: U) => T)
): (...args: U) => T {
  return typeof obj === "function" ? (obj as (...args: U) => T) : () => obj;
}

export function flattenNestedFunctionMap<T>(
  obj: any,
  paths: string[] = []
): Array<{ paths: string[]; value: T }> {
  const result: Array<{ paths: string[]; value: T }> = [];

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value != null && typeof value === "object") {
      result.push(...flattenNestedFunctionMap<T>(value, [...paths, key]));
    } else if (typeof value === "function") {
      result.push({
        paths: [...paths, key],
        value
      });
    }
  });

  return result;
}

export function mapNestedFunctionMap<T>(
  obj: any,
  callback: (value: T) => T
): any {
  const result: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value != null && typeof value === "object") {
      result[key] = mapNestedFunctionMap(value, callback);
    } else if (typeof value === "function") {
      result[key] = callback(value);
    }
  });

  return result;
}

export class PatchedPromise<T> implements PromiseLike<T> {
  public rejectionHandled: boolean = false;

  private readonly _promise: Promise<T>;

  constructor(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) {
    this._promise = new Promise(executor);
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, this._patchOnRejected(onrejected));
  }

  public catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    return this._promise.catch(this._patchOnRejected(onrejected));
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this._promise.finally(onfinally);
  }

  private _patchOnRejected<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ) {
    return onrejected != null
      ? (reason: any) => {
          this.rejectionHandled = true;
          return onrejected(reason);
        }
      : onrejected;
  }
}
