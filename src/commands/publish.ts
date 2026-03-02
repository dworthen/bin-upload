import { createCommand } from '@d-dev/roar'
import { Glob } from 'bun'
import { type Config, loadConfig } from '@/lib/config'
import { getReleaseInfo, uploadReleaseAsset } from '@/lib/github'
import { uploadToNpm } from '@/lib/npm'
import { objToCliArgs } from '@/lib/objects'
import { getPackOutputDir } from '@/lib/paths'

async function publishToNpm(config: Config, filter?: string): Promise<number> {
  if (!config.npm) {
    console.warn(
      'npm configuration is missing in the config file. Skipping publishing npm packages.',
    )
    return 0
  }

  const dir = await getPackOutputDir(config, 'npm')

  console.log(`Publishing npm packages...`)
  const glob = new Glob(filter ?? `*.tgz`)
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
    const code = await uploadToNpm(config, assetPath)
    results.push(code)
  }

  if (results.some((code) => code !== 0)) {
    console.error(`Error publishing one or more npm packages.`)
  } else {
    console.log(`Finished publishing npm packages.`)
  }

  return results.some((code) => code !== 0) ? 1 : 0
}

async function publishPypi(config: Config, filter?: string): Promise<number> {
  if (!config.pypi) {
    console.warn(
      'PyPI configuration is missing in the config file. Skipping publishing PyPI packages.',
    )
    return 0
  }

  const dir = `${(await getPackOutputDir(config, 'pypi')).replace(/\\/g, '/')}/${filter ?? '*.whl'}`

  console.log(`Publishing PyPI packages ${dir}...`)
  const publishArgs = objToCliArgs(config.pypi.publish || {})
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

async function publishGithub(config: Config, filter?: string): Promise<number> {
  if (!config.github) {
    console.warn(
      'GitHub configuration is missing in the config file. Skipping publishing GitHub releases.',
    )
    return 0
  }
  if (!config.github.release.tag_name) {
    console.error(
      'GitHub release configuration error: "github.release.tag_name" is required.',
    )
    return 1
  }

  const releaseInfo = await getReleaseInfo(config)
  const ghDir = await getPackOutputDir(config, 'github')

  const glob = new Glob(filter ?? `*`)
  const matches: string[] = []

  for (const matchingPath of glob.scanSync({
    cwd: ghDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  })) {
    matches.push(matchingPath)
  }

  const results: number[] = []
  for (const assetPath of matches) {
    const code = await uploadReleaseAsset(config, releaseInfo, assetPath)
    results.push(code)
  }

  if (results.some((code) => code !== 0)) {
    console.error(`Error publishing one or more GitHub release assets.`)
  } else {
    console.log(`Finished publishing GitHub releases.`)
  }

  return results.some((code) => code !== 0) ? 1 : 0
}

export const publishCommand = createCommand(
  {
    usageName: 'bin-upload publish',
    description: 'Publish binaries to npm, pypi, or github.',
    flags: {
      config: {
        type: 'string',
        shortFlag: 'c',
        description: 'Path to yaml configuration file.',
        default: 'bin-upload.config.yaml',
      },
      source: {
        type: 'string',
        choices: ['all', 'npm', 'pypi', 'github'],
        description: 'Sources to publish (all, npm, pypi, github).',
        default: 'all',
      },
      set: {
        type: 'string',
        shortFlag: 's',
        description:
          'Set configuration values via command line, e.g. --set npm.packageJson.version=1.0.0.',
        isMultiple: true,
        default: [],
      },
      filter: {
        type: 'string',
        description: 'Filter pattern of what to publish.',
      },
      verbose: {
        type: 'boolean',
        description: 'Enable verbose logging.',
        default: false,
      },
    },
  },
  async (result) => {
    const config = await loadConfig(result.flags.config, result.flags.set)

    if (result.flags.verbose) {
      console.log('Loaded configuration:')
      console.log(Bun.YAML.stringify(config, null, 2))
    }

    const results: number[] = []

    if (result.flags.source === 'all' || result.flags.source === 'npm') {
      results.push(await publishToNpm(config, result.flags.filter))
    }
    if (result.flags.source === 'all' || result.flags.source === 'pypi') {
      results.push(await publishPypi(config, result.flags.filter))
    }
    if (result.flags.source === 'all' || result.flags.source === 'github') {
      results.push(await publishGithub(config, result.flags.filter))
    }

    process.exit(results.some((code) => code !== 0) ? 1 : 0)
  },
)
