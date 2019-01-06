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
  if (baseNamespace === "") {
    return key;
  }
  if (key === "") {
    return baseNamespace;
  }

  return `${baseNamespace}/${key}`;
}
