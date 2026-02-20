export function mergeObjs(
  target: Record<string, any>,
  source: Record<string, any>,
): void {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {}
      }
      mergeObjs(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
}

export function objToCliArgs(obj: Record<string, unknown>): string[] {
  return Object.entries(obj)
    .filter(([_, value]) => {
      return (
        value !== undefined &&
        value !== null &&
        !(typeof value === 'boolean' && value === false)
      )
    })
    .flat()
    .filter((value) => {
      return typeof value !== 'boolean'
    })
    .map((value) => `${value}`)
}

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
  paths: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [path, value] of Object.entries(paths)) {
    setByPath(result, path, value)
  }

  return result
}

export function setArrayToObject(setArray: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const item of setArray) {
    const [key, value] = item.split('=')
    if (!key || value === undefined) {
      throw new Error(
        `Invalid --set value: ${item}. Expected format is key=value.`,
      )
    }

    result[key] = value
  }

  return fromDotNotation(result)
}
