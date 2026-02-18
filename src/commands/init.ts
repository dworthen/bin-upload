import meow from 'meow'

export async function init(argv: string[]) {
  const cli = meow(
    `
    Usage
      $ bin-upload init [options]  

    Options
      --help, -h      Show help.
      --config, -c    Path to yaml configuration file to output.
      --force, -f     Overwrite existing configuration file if it exists.

    Examples
      $ bin-upload init
      $ bin-upload init --config ./bin-upload.config.yaml
  `,
    {
      argv: argv,
      importMeta: import.meta,
      description: 'Initialize a bin-to-npm configuration file.',
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
          isRequired: true,
        },
        force: {
          type: 'boolean',
          shortFlag: 'f',
          default: false,
        },
      },
    },
  )

  if (cli.flags.help) {
    cli.showHelp()
    process.exit(1)
  }

  console.log(cli)
}
