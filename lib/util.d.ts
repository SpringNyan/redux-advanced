export declare function convertNamespaceToPath(namespace: string): string;
export declare function parseActionType(type: string): {
    namespace: string;
    key: string;
};
export declare function buildNamespace(baseNamespace: string, key: string): string;
