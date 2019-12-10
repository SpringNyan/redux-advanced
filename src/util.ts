export const nothingToken: unique symbol = "@@REDUX_ADVANCED_NOTHING" as any;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends ((...args: any[]) => any) | any[]
    ? T[P]
    : DeepPartial<T[P]>;
};

export function isObject(obj: any): boolean {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}

export function wrapFunctionFactory<T, U extends any[]>(
  obj: T | ((...args: U) => T)
): (...args: U) => T {
  return typeof obj === "function" ? (obj as (...args: U) => T) : () => obj;
}

export function assignObjectDeeply(
  target: any,
  source: any,
  func: (value: any, paths: string[], target: any) => any,
  paths: string[] = []
): any {
  if (!isObject(target)) {
    throw new Error(`Failed to assign object deeply: target is not an object`);
  }

  if (!isObject(source)) {
    throw new Error(`Failed to assign object deeply: source is not an object`);
  }

  Object.keys(source).forEach((key) => {
    if (key === "__proto__") {
      return;
    }

    const value = source[key];

    if (isObject(value)) {
      if (target[key] === undefined) {
        target[key] = {};
      }
      if (isObject(target[key])) {
        assignObjectDeeply(target[key], value, func, [...paths, key]);
      } else {
        throw new Error(
          `Failed to assign object deeply: target["${key}"] is not an object`
        );
      }
    } else {
      const result = func(value, [...paths, key], target);
      if (result !== undefined) {
        target[key] = result !== nothingToken ? result : undefined;
      }
    }
  });

  return target;
}

export function merge(target: any, ...sources: any[]): any {
  sources.forEach((source) => {
    assignObjectDeeply(target, source, (value, paths, target) => {
      target[paths[paths.length - 1]] = value;
    });
  });

  return target;
}

export function convertNamespaceToPath(namespace: string): string {
  return namespace.replace(/\//g, ".");
}

export function convertPathToNamespace(path: string): string {
  return path.replace(/\./g, "/");
}

export function joinLastPart(
  str: string,
  lastPart: string | undefined,
  splitter = "/"
): string {
  if (!lastPart) {
    return str;
  }

  if (!str) {
    return lastPart;
  }

  return `${str}${splitter}${lastPart}`;
}

export function splitLastPart(str: string, splitter = "/"): [string, string] {
  const index = str.lastIndexOf(splitter);
  return index >= 0
    ? [str.substring(0, index), str.substring(index + 1)]
    : ["", str];
}

export class PatchedPromise<T> implements Promise<T> {
  public [Symbol.toStringTag]: string;

  private readonly _promise: Promise<T>;

  private _hasThen = false;

  constructor(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void,
    private readonly _onunhandledrejection: (reason?: any) => void
  ) {
    this._promise = new Promise(executor);
    this._promise.then(undefined, (reason) => {
      if (!this._hasThen) {
        this._onunhandledrejection(reason);
      }
    });
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
    this._hasThen = true;
    return new PatchedPromise((resolve) => {
      resolve(this._promise.then(onfulfilled, onrejected));
    }, this._onunhandledrejection);
  }

  public catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    this._hasThen = true;
    return new PatchedPromise((resolve) => {
      resolve(this._promise.catch(onrejected));
    }, this._onunhandledrejection);
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    this._hasThen = true;
    return new PatchedPromise((resolve) => {
      resolve(this._promise.finally(onfinally));
    }, this._onunhandledrejection);
  }
}
