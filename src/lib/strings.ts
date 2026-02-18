export function replaceEnvVars(str: string): string {
  return str
    .replace(/(?<!\\)\$\{(\w+)\}/g, (_, varName) => {
      const value = process.env[varName]
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not defined.`)
      }
      return value
    })
    .replace(/\\\$\{/g, '${') // Unescape any escaped variables;
}
