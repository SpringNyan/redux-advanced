const namespaceSplitterRegExp = new RegExp("/", "g");
export function convertNamespaceToPath(namespace) {
    return namespace.replace(namespaceSplitterRegExp, ".");
}
export function parseActionType(type) {
    const lastSplitterIndex = type.lastIndexOf("/");
    const namespace = type.substring(0, lastSplitterIndex);
    const key = type.substring(lastSplitterIndex + 1);
    return { namespace, key };
}
export function buildNamespace(baseNamespace, key) {
    if (baseNamespace === "") {
        return key;
    }
    if (key === "") {
        return baseNamespace;
    }
    return `${baseNamespace}/${key}`;
}
