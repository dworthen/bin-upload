import { resolve } from 'node:path'

const builds: Record<string, string> = {
  'bun-linux-arm64': 'bin/linux-arm64/bun-env-print',
  'bun-linux-arm64-musl': 'bin/linux-arm64-musl/bun-env-print',
  'bun-linux-x64-modern': 'bin/linux-x64/bun-env-print',
  'bun-linux-x64-musl-modern': 'bin/linux-x64-musl/bun-env-print',
  'bun-windows-x64-modern': 'bin/win-x64/bun-env-print',
  'bun-darwin-arm64': 'bin/darwin-arm64/bun-env-print',
  'bun-darwin-x64': 'bin/darwin-x64/bun-env-print',
}

async function buildTarget(target: string, outFile: string): Promise<void> {
  console.log(`Building for target: ${target}...`)
  await Bun.build({
    entrypoints: ['./index.ts'],
    compile: {
      // @ts-expect-error
      target,
      outfile: resolve(outFile),
      autoloadTsConfig: false,
      autoloadPackageJson: false,
      autoloadBunConfig: false,
      autoloadDotEnv: true,
    },
    minify: true,
    sourcemap: 'linked',
    env: 'disable',
  })
  console.log(`Built ${target} successfully! Output: ${outFile}`)
}

await Promise.all(
  Object.entries(builds).map(
    async ([target, outFile]) => await buildTarget(target, outFile),
  ),
)
