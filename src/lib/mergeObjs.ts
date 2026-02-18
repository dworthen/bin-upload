export function mergeObjs<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>,
): void {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== 'object') {
        // @ts-expect-error
        target[key] = {}
      }
      mergeObjs(target[key], source[key])
    } else {
      // @ts-expect-error
      target[key] = source[key]
    }
  }
}
