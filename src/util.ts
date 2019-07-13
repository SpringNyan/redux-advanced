export const nil = {} as symbol;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends ((...args: any[]) => any) | any[]
    ? T[P]
    : DeepPartial<T[P]>
};

export function factoryWrapper<T, U extends any[]>(
  obj: T | ((...args: U) => T)
): (...args: U) => T {
  return typeof obj === "function" ? (obj as (...args: U) => T) : () => obj;
}

export function isObject(obj: any): boolean {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}

export function mapObjectDeeply(
  target: any,
  source: any,
  func: (value: any, paths: string[], target: any) => any,
  override: boolean = false,
  paths: string[] = []
): any {
  Object.keys(source).forEach((key) => {
    const value = source[key];

    if (isObject(value)) {
      let nextTarget = target[key];
      if (nextTarget === undefined) {
        nextTarget = {};
        target[key] = nextTarget;
      }

      if (!isObject(nextTarget)) {
        throw new Error(`target["${key}"] should be an object`);
      }

      mapObjectDeeply(nextTarget, value, func, override, [...paths, key]);
    } else {
      if (!override && target[key] !== undefined) {
        throw new Error(`target["${key}"] already has a value`);
      }

      const result = func(value, [...paths, key], target);
      if (result !== undefined) {
        target[key] = result;
      }
    }
  });

  return target;
}

export function merge(target: any, ...sources: any[]): any {
  sources.forEach((source) => {
    if (isObject(source)) {
      mapObjectDeeply(target, source, (value) => value, true);
    }
  });

  return target;
}

export function convertNamespaceToPath(namespace: string): string {
  return namespace.replace(/\//g, ".");
}

export function joinLastPart(
  str: string,
  lastPart: string,
  splitter: string = "/"
): string {
  if (!lastPart) {
    return str;
  }

  if (!str) {
    return lastPart;
  }

  return `${str}${splitter}${lastPart}`;
}

export function splitLastPart(
  str: string,
  splitter: string = "/"
): [string, string] {
  const index = str.lastIndexOf(splitter);
  return index >= 0
    ? [str.substring(0, index), str.substring(index + 1)]
    : [str, ""];
}

export class PatchedPromise<T> implements Promise<T> {
  public [Symbol.toStringTag]: string;

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
