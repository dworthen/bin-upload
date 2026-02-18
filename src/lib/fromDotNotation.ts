function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    const nextKey = keys[i + 1]
    const isNextArray = nextKey && /^\d+$/.test(nextKey)

    if (!(key in current)) {
      current[key] = isNextArray ? [] : {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]!] = value
}

export function fromDotNotation(
  paths: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [path, value] of Object.entries(paths)) {
    setByPath(result, path, value)
  }

  return result
}
