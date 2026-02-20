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
    .flatMap(([key, value]) => [`--${key}`, value])
    .filter((value) => {
      return typeof value !== 'boolean'
    })
    .map((value) => `${value}`)
}

export function getRegexIndexes(str: string, regex: RegExp): number[] {
  return Array.from(str.matchAll(regex)).map((match) => match.index)
}

function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const dotIndexes = getRegexIndexes(path, /(?<!\\)\./g)

  const keys: string[] = []
  let lastIndex = 0
  for (const index of dotIndexes) {
    keys.push(path.slice(lastIndex, index).replace(/\\\./g, '.'))
    lastIndex = index + 1
  }
  keys.push(path.slice(lastIndex).replace(/\\\./g, '.'))

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

function parseValue(value: string): any {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (!Number.isNaN(Number(value))) return Number(value)
  return value
}

export function setArrayToObject(setArray: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const item of setArray) {
    const equalIndexes = getRegexIndexes(item, /(?<!\\)=/g)
    if (equalIndexes.length === 0) {
      result[item.replace(/\\=/g, '=')] = true
    } else if (equalIndexes.length === 1) {
      const index = equalIndexes[0]!
      const key = item.slice(0, index).replace(/\\=/g, '=')
      const value = item.slice(index + 1).replace(/\\=/g, '=')
      result[key] = parseValue(value)
    } else {
      throw new Error(
        `Invalid --set value: ${item}. Expected format is key or key=value, with only one unescaped '=' character.`,
      )
    }
  }

  return fromDotNotation(result)
}
