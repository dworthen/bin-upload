import { resolve } from 'node:path'
import { checkbox, confirm, input } from '@inquirer/prompts'
import meow from 'meow'
import validate from 'validate-npm-package-name'
import { configTemplate } from '@/templates/configTemplate'
import { renderString } from '@/templates/renderString'

async function getBinariesConfig(): Promise<Record<string, any>> {
  const binaryInfo: Record<string, Record<string, any>> = {
    'linux-x64': {
      npm: true,
      os: 'linux',
      arch: 'x64',
      tag: 'manylinux_2_17_x86_64',
      format: 'tar.gz',
    },
    'linux-x64-musl': {
      npm: false,
      tag: 'musllinux_1_2_x86_64',
      format: 'tar.gz',
    },
    'linux-arm64': {
      npm: true,
      os: 'linux',
      arch: 'arm64',
      tag: 'manylinux_2_17_aarch64',
      format: 'tar.gz',
    },
    'linux-arm64-musl': {
      npm: false,
      tag: 'musllinux_1_2_aarch64',
      format: 'tar.gz',
    },
    'win-x64': {
      npm: true,
      os: 'win32',
      arch: 'x64',
      tag: 'win_amd64',
      format: 'zip',
    },
    'win-arm64': {
      npm: true,
      os: 'win32',
      arch: 'arm64',
      tag: 'win_arm64',
      format: 'zip',
    },
    'darwin-x64': {
      npm: true,
      os: 'darwin',
      arch: 'x64',
      tag: 'macosx_10_9_x86_64',
      format: 'tar.gz',
    },
    'darwin-arm64': {
      npm: true,
      os: 'darwin',
      arch: 'arm64',
      tag: 'macosx_11_0_arm64',
      format: 'tar.gz',
    },
  }

  const selectedBinaries = await checkbox({
    message: 'Which binaries do you want to build and publish?',
    choices: Object.keys(binaryInfo).map((binaryId) => ({
      name: binaryId,
      value: binaryId,
    })),
    required: true,
    pageSize: 10,
    loop: false,
  })

  const binariesConfig: Record<
    string,
    Record<string, any>
  > = Object.fromEntries(
    Object.entries(binaryInfo).filter(([binaryId]) =>
      selectedBinaries.includes(binaryId),
    ),
  )

  for (const [binaryId, info] of Object.entries(binariesConfig)) {
    info.path = await input({
      message: `What is the path to the binary for ${binaryId}?`,
      default: `./bin/${binaryId}/`,
      prefill: 'editable',
      required: true,
    })
  }

  return binariesConfig
}

async function getNpmConfig(): Promise<Record<string, any>> {
  const npmConfig: Record<string, any> = {}

  npmConfig.name = await input({
    message: 'What is the name of your npm package?',
    required: true,
    validate: (value) => {
      const validation = validate(value)
      if (validation.validForNewPackages) {
        return true
      } else {
        return `Invalid npm package name: ${validation.errors?.join(', ') ?? ''}`
      }
    },
  })

  npmConfig.description = await input({
    message: 'What is the description of your npm package?',
    required: false,
  })

  npmConfig.author = await input({
    message: 'Who is the author of your npm package (NAME, <EMAIL>)?',
    required: false,
  })

  npmConfig.license = await input({
    message: 'What is the license of your npm package?',
    default: 'MIT',
    prefill: 'editable',
    required: false,
  })

  npmConfig.repository = await input({
    message:
      'What is the repository URL of your npm package (github:OWNER/REPO)?',
    required: false,
  })

  const keywords: string[] = []
  let keyword: string | null

  do {
    keyword = await input({
      message: 'Enter a keyword for your npm package (leave blank to finish):',
      required: false,
    })
    if (keyword) {
      keywords.push(keyword)
    }
  } while (keyword)

  if (keywords.length > 0) {
    npmConfig.keywords = keywords
  }

  return npmConfig
}

async function getPypiConfig(): Promise<Record<string, any>> {
  const pypiConfig: Record<string, any> = {}

  pypiConfig.name = await input({
    message: 'What is the name of your PyPI package?',
    required: true,
  })

  pypiConfig.summary = await input({
    message: 'What is the summary of your PyPI package?',
    required: false,
  })

  pypiConfig.author = await input({
    message: 'Who is the author of your PyPI package (NAME, <EMAIL>)?',
    required: false,
  })

  pypiConfig.license = await input({
    message: 'What is the license of your PyPI package?',
    default: 'MIT',
    prefill: 'editable',
    required: false,
  })

  pypiConfig.projectUrl = await input({
    message:
      'What is the project URL of your PyPI package (https://github.com/OWNER/REPO)?',
    required: false,
  })

  const keywords: string[] = []
  let keyword: string | null

  do {
    keyword = await input({
      message: 'Enter a keyword for your pypi package (leave blank to finish):',
      required: false,
    })
    if (keyword) {
      keywords.push(keyword)
    }
  } while (keyword)

  if (keywords.length > 0) {
    pypiConfig.keywords = keywords
  }

  return pypiConfig
}

async function getGithubConfig(): Promise<Record<string, any>> {
  const ghConfig: Record<string, any> = {}

  ghConfig.owner = await input({
    message: 'Who is the GitHub owner (username or organization)?',
    required: true,
  })

  ghConfig.repo = await input({
    message: 'What is the GitHub repository name?',
    required: true,
  })

  return ghConfig
}

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
      description: 'Initialize a bin-upload configuration file.',
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
          isRequired: false,
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

  const results: Record<string, any> = {
    npm: null,
    pypi: null,
    github: null,
  }

  const configPath =
    cli.flags.config ||
    (await input({
      message: 'Where do you want to output the configuration file?',
      default: './bin-upload.config.yaml',
      prefill: 'editable',
      required: true,
    }))

  const configFile = Bun.file(resolve(configPath))

  if (!cli.flags.force && (await configFile.exists())) {
    const overwrite = await confirm({
      message: `Configuration file already exists at ${configPath}. Do you want to overwrite it?`,
      default: false,
    })
    if (!overwrite) {
      console.warn('Aborting initialization.')
      process.exit(1)
    }
  }

  const binariesConfig = await getBinariesConfig()

  results.binaries = Object.entries(binariesConfig)

  // @ts-expect-error
  results.npmBinaries = results.binaries.filter(([_, info]) => info.npm)

  const publishNpm = await confirm({
    message: 'Do you want to publish to npm?',
    default: true,
  })

  if (publishNpm) {
    results.npm = await getNpmConfig()
  }

  const publishPypi = await confirm({
    message: 'Do you want to publish to PyPI?',
    default: true,
  })

  if (publishPypi) {
    results.pypi = await getPypiConfig()
  }

  const publishGithub = await confirm({
    message: 'Do you want to publish to GitHub releases?',
    default: true,
  })

  if (publishGithub) {
    results.gh = await getGithubConfig()
  }

  if (!publishNpm && !publishPypi && !publishGithub) {
    console.warn('No publication targets selected. Aborting initialization.')
    process.exit(1)
  }

  const contents = renderString(configTemplate, results)

  await Bun.write(configFile, contents)

  console.log(`Configuration file written to ${configPath}`)
}
