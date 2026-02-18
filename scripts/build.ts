import { join } from 'node:path'

const builds: Record<string, string> = {
  'bun-linux-arm64': 'bin/linux-arm64/bin-upload',
  'bun-linux-arm64-musl': 'bin/linux-arm64-musl/bin-upload',
  'bun-linux-x64-modern': 'bin/linux-x64/bin-upload',
  'bun-linux-x64-musl-modern': 'bin/linux-x64-musl/bin-upload',
  'bun-windows-x64-modern': 'bin/win-x64/bin-upload',
  'bun-darwin-arm64': 'bin/darwin-arm64/bin-upload',
  'bun-darwin-x64': 'bin/darwin-x64/bin-upload',
}

async function buildTarget(target: string, outFile: string): Promise<void> {
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    compile: {
      // @ts-expect-error
      target,
      outfile: join(process.cwd(), outFile),
      autoloadTsConfig: false,
      autoloadPackageJson: false,
      autoloadBunConfig: false,
      autoloadDotEnv: true,
    },
    minify: true,
    sourcemap: 'linked',
    env: 'disable',
  })
}

await Promise.all(
  Object.entries(builds).map(
    async ([target, outFile]) => await buildTarget(target, outFile),
  ),
)
