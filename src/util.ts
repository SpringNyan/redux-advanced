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

export function buildNamespace(baseNamespace: string, key?: string): string {
  return key == null || key === "" ? baseNamespace : `${baseNamespace}/${key}`;
}

export function startsWith(str: string, test: string): boolean {
  if (str.startsWith) {
    return str.startsWith(test);
  } else {
    return str.lastIndexOf(test, 0) === 0;
  }
}

export function endsWith(str: string, test: string): boolean {
  if (str.endsWith) {
    return str.endsWith(test);
  } else {
    const offset = str.length - test.length;
    return offset >= 0 && str.lastIndexOf(test, offset) === offset;
  }
}
