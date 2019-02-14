export type Override<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>> & T2;

const namespaceSplitterRegExp = new RegExp("/", "g");
export function convertNamespaceToPath(namespace: string): string {
  return namespace.replace(namespaceSplitterRegExp, ".");
}

export function parseActionType(
  type: string
): { namespace: string; key: string } {
  const lastSplitterIndex = type.lastIndexOf("/");
  const namespace = type.substring(0, lastSplitterIndex);
  const key = type.substring(lastSplitterIndex + 1);

  return { namespace, key };
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
