import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import meow from 'meow'
import { type Config, loadConfig } from '@/lib/config'
import { getPackOutputDir } from '@/lib/paths'
import { runWorker } from '@/workers/runWorker'

async function validate(config: Config): Promise<void> {
  const nonExistingBinaries = (
    await Promise.all(
      Object.entries(config.binaries).map(async ([id, path]) => {
        const exists = await Bun.file(path).exists()
        return { id, path, exists }
      }),
    )
  )
    .filter((binary) => !binary.exists)
    .map((bin) => bin.path)

  if (nonExistingBinaries.length > 0) {
    console.error(
      `The following binary paths do not exist: ${nonExistingBinaries.join(', ')}`,
    )
    process.exit(1)
  }
}

async function clearDir(config: Config): Promise<void> {
  const outDir = await getPackOutputDir(config)
  if (!existsSync(outDir)) {
    return
  }
  const files = await readdir(outDir)
  await Promise.all(
    files.map(
      async (file) =>
        await rm(resolve(outDir, file), {
          recursive: true,
          force: true,
        }),
    ),
  )
}

async function prePackCommand(config: Config): Promise<void> {
  if (config.pack?.prePackCommand) {
    console.log(`Running pre-pack command: ${config.pack.prePackCommand}`)
    const proc = Bun.spawn(config.pack.prePackCommand.split(' '), {
      // stdio: ['inherit', 'inherit', 'inherit'],
    })

    const textDecoder = new TextDecoder()

    for await (const chunk of proc.stdout) {
      process.stdout.write(textDecoder.decode(chunk))
    }

    if (proc.stderr) {
      // @ts-expect-error
      for await (const chunk of proc.stderr) {
        process.stderr.write(textDecoder.decode(chunk))
      }
    }

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      process.exit(exitCode)
    }
  }
}

async function buildNpmPackages(config: Config): Promise<number> {
  if (!config.npm) {
    console.warn(
      'NPM configuration is missing in the config file. Skipping packing npm packages.',
    )
    return 0
  }

  const workerUrl = new URL('../workers/buildNpmPackage.ts', import.meta.url)
    .href

  const processOutputs = await Promise.all([
    ...Object.keys(config.npm!.binaryPackages).map(async (binaryId) => {
      const message = {
        config,
        binaryId,
      }

      return await runWorker(workerUrl, message)
    }),
    runWorker(workerUrl, { config }),
  ])

  return processOutputs.some((code) => code !== 0) ? 1 : 0
}

async function buildPyPiPackage(config: Config): Promise<number> {
  if (!config.pypi) {
    console.warn(
      'PyPI configuration is missing in the config file. Skipping packing PyPI packages.',
    )
    return 0
  }

  const workerUrl = new URL('../workers/buildPypiPackage.ts', import.meta.url)
    .href

  const processOutputs = await Promise.all([
    ...Object.keys(config.pypi!.platformTags).map(async (binaryId) => {
      const message = {
        config,
        binaryId,
      }

      return await runWorker(workerUrl, message)
    }),
  ])

  return processOutputs.some((code) => code !== 0) ? 1 : 0
}

async function buildGithubArchives(config: Config): Promise<number> {
  if (!config.github) {
    console.warn(
      'GitHub configuration is missing in the config file. Skipping packing GitHub archives.',
    )
    return 0
  }

  const workerUrl = new URL(
    '../workers/buildGithubArchives.ts',
    import.meta.url,
  ).href

  const processOutputs = await Promise.all([
    ...Object.keys(config.github!.archives).map(async (archiveId) => {
      const message = {
        config,
        archiveId,
      }

      return await runWorker(workerUrl, message)
    }),
  ])

  return processOutputs.some((code) => code !== 0) ? 1 : 0
}

export async function pack(argv: string[]) {
  const cli = meow(
    `
    Usage
      $ bin-upload pack [options]  

    Options
      --help, -h      Show help.
      --config, -c    (Optional) Path to yaml configuration file [default=bin-upload.config.yaml].
      --set, -s       (Optional) Set configuration values via command line, e.g. --set npm.packageJson.version=1.0.0.
      --source        (Optional) Sources to pack (all, npm, pypi, github) [default=all].
      --verbose       (Optional) Enable verbose logging.

    Examples
      $ bin-upload pack
      $ bin-upload pack --config ./bin-upload.config.yaml
      $ bin-upload pack -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0
  `,
    {
      argv: argv,
      importMeta: import.meta,
      description: 'Pack binaries into publishable artifacts.',
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
    console.log('Loaded configuration:')
    console.log(Bun.YAML.stringify(config, null, 2))
  }

  await clearDir(config)
  await prePackCommand(config)
  await validate(config)

  const cmds: Array<Promise<number>> = []
  if (cli.flags.source === 'all' || cli.flags.source === 'npm') {
    cmds.push(buildNpmPackages(config))
  }
  if (cli.flags.source === 'all' || cli.flags.source === 'pypi') {
    cmds.push(buildPyPiPackage(config))
  }
  if (cli.flags.source === 'all' || cli.flags.source === 'github') {
    cmds.push(buildGithubArchives(config))
  }

  const results = await Promise.all(cmds)

  process.exit(results.some((code) => code !== 0) ? 1 : 0)
}
