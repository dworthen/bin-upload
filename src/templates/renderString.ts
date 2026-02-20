import { Eta } from 'eta'

const eta = new Eta({
  useWith: true,
  autoEscape: false,
  autoTrim: false,
})

export function renderString(
  template: string,
  data: Record<string, any>,
): string {
  return eta.renderString(template, data)
}
