import { fromDotNotation } from '@/lib/fromDotNotation'

export function setArrayToObject(setArray: string[]): Record<string, any> {
  const result: Record<string, any> = {}

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
