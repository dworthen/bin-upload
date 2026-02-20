import { Glob } from 'bun'
import meow from 'meow'
import { type Config, loadConfig } from '@/lib/config'
import { getReleaseId, uploadReleaseAsset } from '@/lib/github'
import { uploadToNpm } from '@/lib/npm'
import { getPackOutputDir } from '@/lib/paths'

async function publishToNpm(config: Config): Promise<number> {
  if (!config.npm) {
    console.warn(
      'npm configuration is missing in the config file. Skipping publishing npm packages.',
    )
    return 0
  }

  const dir = await getPackOutputDir(config, 'npm')

  console.log(`Publishing npm packages...`)
  const glob = new Glob(`*.tgz`)
  const matches: string[] = []

  for (const matchingPath of glob.scanSync({
    cwd: dir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  })) {
    matches.push(matchingPath)
  }

  const results: number[] = []
  for (const assetPath of matches) {
    results.push(await uploadToNpm(config, assetPath))
  }

  console.log(`Finished publishing npm packages.`)

  return results.some((code) => code !== 0) ? 1 : 0
}

async function publishPypi(config: Config): Promise<number> {
  if (!config.pypi) {
    console.warn(
      'PyPI configuration is missing in the config file. Skipping publishing PyPI packages.',
    )
    return 0
  }

  const dir = `${(await getPackOutputDir(config, 'pypi')).replace(/\\/g, '/')}/*.whl`

  console.log(`Publishing PyPI packages ${dir}...`)
  const publishArgsObj = config.pypi.publish || {}
  const publishArgs = Object.entries(publishArgsObj).flatMap(([key, value]) => {
    if (value === '') {
      return value ? [`--${key}`] : []
    }

    return [`--${key}`, String(value)]
  })
  const textDecoder = new TextDecoder()
  const proc = Bun.spawn(['uv', 'publish', ...publishArgs, dir])
  for await (const chunk of proc.stdout) {
    process.stdout.write(textDecoder.decode(chunk))
  }

  if (proc.stderr) {
    // @ts-expect-error
    for await (const chunk of proc.stderr) {
      process.stderr.write(textDecoder.decode(chunk))
    }
  }

  console.log(`Finished publishing PyPI packages.`)
  return await proc.exited
}

async function publishGithub(config: Config): Promise<number> {
  if (!config.github) {
    console.warn(
      'GitHub configuration is missing in the config file. Skipping publishing GitHub releases.',
    )
    return 0
  }

  const releaseId = await getReleaseId(config)
  const ghDir = await getPackOutputDir(config, 'github')

  const glob = new Glob(`*`)
  const matches: string[] = []

  for (const matchingPath of glob.scanSync({
    cwd: ghDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  })) {
    matches.push(matchingPath)
  }

  // const results = await Promise.all(
  //   matches.map(async (assetPath) => {
  //     return await uploadReleaseAsset(config, releaseId, assetPath)
  //   }),
  // )

  const results: number[] = []
  for (const assetPath of matches) {
    results.push(await uploadReleaseAsset(config, releaseId, assetPath))
  }

  console.log(`Finished publishing GitHub releases.`)

  return results.some((code) => code !== 0) ? 1 : 0
}

export async function publish(argv: string[]) {
  const cli = meow(
    `
    Usage
      $ bin-upload publish [options]  

    Options
      --help, -h      Show help.
      --config, -c    (Optional) Path to yaml configuration file [default=bin-upload.config.yaml].
      --set, -s       (Optional) Set configuration values via command line, e.g. --set npm.packageJson.version=1.0.0.
      --source        (Optional) Sources to pack (all, npm, pypi, github) [default=all].
      --verbose       (Optional) Enable verbose logging.

    Examples
      $ bin-upload publish
      $ bin-upload publish --config ./bin-upload.config.yaml
      $ bin-upload publish -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0
  `,
    {
      argv: argv,
      importMeta: import.meta,
      description: 'Publish binaries to npm, pypi, or github.',
      autoHelp: false,
      autoVersion: false,
      flags: {
        help: {
          type: 'boolean',
          shortFlag: 'h',
        },
        config: {
          type: 'string',
          shortFlag: 'c',
          default: 'bin-upload.config.yaml',
        },
        source: {
          type: 'string',
          default: 'all',
          choices: ['all', 'npm', 'pypi', 'github'],
        },
        set: {
          type: 'string',
          shortFlag: 's',
          isMultiple: true,
          default: [],
        },
        verbose: {
          type: 'boolean',
          default: false,
        },
      },
    },
  )

  if (cli.flags.help) {
    cli.showHelp()
    process.exit(1)
  }

  const config = await loadConfig(cli.flags.config, cli.flags.set)

  if (cli.flags.verbose) {
    console.log('Loaded configuration:', JSON.stringify(config, null, 2))
  }

  const results: number[] = []
  if (cli.flags.source === 'all' || cli.flags.source === 'npm') {
    results.push(await publishToNpm(config))
  }
  if (cli.flags.source === 'all' || cli.flags.source === 'pypi') {
    results.push(await publishPypi(config))
  }
  if (cli.flags.source === 'all' || cli.flags.source === 'github') {
    results.push(await publishGithub(config))
  }

  process.exit(results.some((code) => code !== 0) ? 1 : 0)
}
