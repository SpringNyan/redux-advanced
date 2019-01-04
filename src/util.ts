const namespaceSplitterRegExp = new RegExp("/", "g");
export function convertNamespaceToPath(namespace: string): string {
  return namespace.replace(namespaceSplitterRegExp, ".");
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
