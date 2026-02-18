import meow from 'meow'
import { loadConfig } from '@/lib/config'

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
}
