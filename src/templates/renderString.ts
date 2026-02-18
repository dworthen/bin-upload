import { Eta } from 'eta'

const eta = new Eta()

export function renderString(
  template: string,
  data: Record<string, any>,
): string {
  return eta.renderString(template, data)
}
