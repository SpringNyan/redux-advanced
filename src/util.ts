export const nil = {} as symbol;

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
