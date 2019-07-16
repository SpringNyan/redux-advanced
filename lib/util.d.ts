export declare const nil: symbol;
export declare type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends ((...args: any[]) => any) | any[] ? T[P] : DeepPartial<T[P]>;
};
export declare function factoryWrapper<T, U extends any[]>(obj: T | ((...args: U) => T)): (...args: U) => T;
export declare function isObject(obj: any): boolean;
export declare function mapObjectDeeply(target: any, source: any, func: (value: any, paths: string[], target: any) => any, paths?: string[]): any;
export declare function merge(target: any, ...sources: any[]): any;
export declare function convertNamespaceToPath(namespace: string): string;
export declare function joinLastPart(str: string, lastPart: string | undefined, splitter?: string): string;
export declare function splitLastPart(str: string, splitter?: string): [string, string];
export declare class PatchedPromise<T> implements Promise<T> {
    [Symbol.toStringTag]: string;
    rejectionHandled: boolean;
    private readonly _promise;
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void);
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
    private _patchOnRejected;
}
