import { join } from 'node:path'
import { mergeObjs } from '@/lib//mergeObjs'
import { setArrayToObject } from '@/lib/setArrayToObject'
import { replaceEnvVars } from '@/lib/strings'

export type FileGlob = {
  cwd: string
  pattern: string
}

export type ArchiveFormat = 'zip' | 'tar.gz'

export type ArchiveDescriptor = {
  format: ArchiveFormat
  files: Array<string | FileGlob>
}

export type GithubReleaseOptions = {
  [key: string]: unknown
  tag_name: string
  name: string
  body: string
}

export type Config = {
  binaries: Record<string, string>
  pack: {
    prePackCommand?: string
    dir: string
    clearDir?: boolean
  }
  npm?: {
    binaryPackages: {
      [key: string]: {
        os: string
        arch: string
      }
    }
    packageJson: {
      [key: string]: unknown
      name: string
      version: string
    }
    readmeFile?: string
    licenseFile?: string
    binNames?: string[]
    publish?: Record<string, string>
  }
  pypi?: {
    platformTags: Record<string, string>
    metadata: {
      [key: string]: unknown
      Name: string
      Version: string
    }
    readmeFile?: string
    licenseFile?: string
    entryPointNames?: string[]
    publish?: Record<string, string>
  }
  github?: {
    owner: string
    repo: string
    token: string
    archives: {
      prefix?: string
      formats: Record<string, ArchiveFormat | ArchiveDescriptor>
      extraFiles?: Array<string | FileGlob>
    }
    files?: Array<string | FileGlob>
    release: Partial<GithubReleaseOptions>
  }
}

function isFileGlob(obj: unknown): boolean {
  return (
    (typeof obj === 'string' && obj.trim() !== '') ||
    (typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as FileGlob).cwd === 'string' &&
      (obj as FileGlob).cwd.trim() !== '' &&
      typeof (obj as FileGlob).pattern === 'string' &&
      (obj as FileGlob).pattern.trim() !== '')
  )
}

function isArchiveDescriptor(obj: unknown): boolean {
  return (
    (typeof obj === 'string' && (obj === 'zip' || obj === 'tar.gz')) ||
    (typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as ArchiveDescriptor).format === 'string' &&
      ((obj as ArchiveDescriptor).format === 'zip' ||
        (obj as ArchiveDescriptor).format === 'tar.gz') &&
      Array.isArray((obj as ArchiveDescriptor).files) &&
      (obj as ArchiveDescriptor).files.every(isFileGlob))
  )
}

async function validateConfig(config: Config): Promise<void> {
  if (!config.binaries || typeof config.binaries !== 'object') {
    console.error(
      'Config validation error: "binaries" is required and must be an object mapping platform to binary path.',
    )
    process.exit(1)
  }

  if (!config.pack || typeof config.pack !== 'object' || !config.pack.dir) {
    console.error(
      'Config validation error: "pack" is required and must be an object with a "dir" property.',
    )
    process.exit(1)
  }

  if (
    config.pack.prePackCommand &&
    (typeof config.pack.prePackCommand !== 'string' ||
      config.pack.prePackCommand.trim() === '')
  ) {
    console.error(
      'Config validation error: "pack.prePackCommand" must be a string if provided.',
    )
    process.exit(1)
  }

  if (config.npm) {
    if (
      typeof config.npm !== 'object' ||
      !config.npm.packageJson ||
      !config.npm.packageJson.name ||
      typeof config.npm.packageJson.name !== 'string' ||
      config.npm.packageJson.name.trim() === '' ||
      !config.npm.packageJson.version ||
      typeof config.npm.packageJson.version !== 'string' ||
      config.npm.packageJson.version.trim() === ''
    ) {
      console.error(
        'Config validation error: "npm" must be an object with a "packageJson" property that includes a "name" and "version" if provided.',
      )
      process.exit(1)
    }
    if (
      config.npm.binaryPackages &&
      (typeof config.npm.binaryPackages !== 'object' ||
        Object.values(config.npm.binaryPackages).some(
          (pkg) =>
            !pkg.os ||
            typeof pkg.os !== 'string' ||
            pkg.os.trim() === '' ||
            !pkg.arch ||
            typeof pkg.arch !== 'string' ||
            pkg.arch.trim() === '',
        ))
    ) {
      console.error(
        'Config validation error: "npm.binaryPackages" must be an object with "os" and "arch" properties for each binary if provided.',
      )
      process.exit(1)
    }
    if (
      config.npm.binNames &&
      (!Array.isArray(config.npm.binNames) ||
        config.npm.binNames.some(
          (name) => typeof name !== 'string' || name.trim() === '',
        ))
    ) {
      console.error(
        'Config validation error: "npm.binaryNames" must be an array of non-empty strings if provided.',
      )
      process.exit(1)
    }
    if (
      config.npm.publish &&
      (typeof config.npm.publish !== 'object' ||
        Object.values(config.npm.publish).some(
          (cmd) => typeof cmd !== 'string' || cmd.trim() === '',
        ))
    ) {
      console.error(
        'Config validation error: "npm.publish" must be an object mapping npm publish cli flags to non-empty strings if provided.',
      )
      process.exit(1)
    }
    if (config.npm.readmeFile) {
      if (
        typeof config.npm.readmeFile !== 'string' ||
        config.npm.readmeFile.trim() === ''
      ) {
        console.error(
          'Config validation error: "npm.readmeFile" must be a string if provided.',
        )
        process.exit(1)
      }
      const file = Bun.file(join(process.cwd(), config.npm.readmeFile))
      if (!(await file.exists())) {
        console.error(
          `Config validation error: "npm.readmeFile" does not exist at path: ${config.npm.readmeFile}`,
        )
        process.exit(1)
      }
    }

    if (config.npm.licenseFile) {
      if (
        typeof config.npm.licenseFile !== 'string' ||
        config.npm.licenseFile.trim() === ''
      ) {
        console.error(
          'Config validation error: "npm.licenseFile" must be a string if provided.',
        )
        process.exit(1)
      }
      const file = Bun.file(join(process.cwd(), config.npm.licenseFile))
      if (!(await file.exists())) {
        console.error(
          `Config validation error: "npm.licenseFile" does not exist at path: ${config.npm.licenseFile}`,
        )
        process.exit(1)
      }
    }
  }

  if (config.pypi) {
    if (
      typeof config.pypi !== 'object' ||
      !config.pypi.metadata ||
      !config.pypi.metadata.Name ||
      typeof config.pypi.metadata.Name !== 'string' ||
      config.pypi.metadata.Name.trim() === '' ||
      !config.pypi.metadata.Version ||
      typeof config.pypi.metadata.Version !== 'string' ||
      config.pypi.metadata.Version.trim() === ''
    ) {
      console.error(
        'Config validation error: "pypi" must be an object with a "metadata" property that includes a "Name" and "Version" if provided.',
      )
      process.exit(1)
    }
    if (
      !config.pypi.platformTags ||
      typeof config.pypi.platformTags !== 'object'
    ) {
      console.error(
        'Config validation error: "pypi.platformTags" is required and must be an object mapping platform to PyPI tag.',
      )
      process.exit(1)
    }
    if (
      config.pypi.entryPointNames &&
      (!Array.isArray(config.pypi.entryPointNames) ||
        config.pypi.entryPointNames.some(
          (name) => typeof name !== 'string' || name.trim() === '',
        ))
    ) {
      console.error(
        'Config validation error: "pypi.entryPointNames" must be an array of non-empty strings if provided.',
      )
      process.exit(1)
    }
    if (
      config.pypi.publish &&
      (typeof config.pypi.publish !== 'object' ||
        Object.values(config.pypi.publish).some(
          (cmd) => typeof cmd !== 'string' || cmd.trim() === '',
        ))
    ) {
      console.error(
        'Config validation error: "pypi.publish" must be an object mapping PyPI publish cli flags to non-empty strings if provided.',
      )
      process.exit(1)
    }
    if (config.pypi.readmeFile) {
      if (
        typeof config.pypi.readmeFile !== 'string' ||
        config.pypi.readmeFile.trim() === ''
      ) {
        console.error(
          'Config validation error: "pypi.readmeFile" must be a string if provided.',
        )
        process.exit(1)
      }
      const file = Bun.file(join(process.cwd(), config.pypi.readmeFile))
      if (!(await file.exists())) {
        console.error(
          `Config validation error: "pypi.readmeFile" does not exist at path: ${config.pypi.readmeFile}`,
        )
        process.exit(1)
      }
    }

    if (config.pypi.licenseFile) {
      if (
        typeof config.pypi.licenseFile !== 'string' ||
        config.pypi.licenseFile.trim() === ''
      ) {
        console.error(
          'Config validation error: "pypi.licenseFile" must be a string if provided.',
        )
        process.exit(1)
      }
      const file = Bun.file(join(process.cwd(), config.pypi.licenseFile))
      if (!(await file.exists())) {
        console.error(
          `Config validation error: "pypi.licenseFile" does not exist at path: ${config.pypi.licenseFile}`,
        )
        process.exit(1)
      }
    }
  }

  if (config.github) {
    if (
      typeof config.github !== 'object' ||
      !config.github.owner ||
      typeof config.github.owner !== 'string' ||
      config.github.owner.trim() === '' ||
      !config.github.repo ||
      typeof config.github.repo !== 'string' ||
      config.github.repo.trim() === '' ||
      !config.github.token ||
      typeof config.github.token !== 'string' ||
      config.github.token.trim() === ''
    ) {
      console.error(
        'Config validation error: "github" must be an object with "owner", "repo", and "token" properties if provided.',
      )
      process.exit(1)
    }
    if (
      !config.github.archives ||
      typeof config.github.archives !== 'object' ||
      !config.github.archives.formats ||
      typeof config.github.archives.formats !== 'object' ||
      Object.values(config.github.archives.formats).some(
        (file) => !isArchiveDescriptor(file),
      )
    ) {
      console.error(
        'Config validation error: "github.archives" is required and must be an object with a "formats" property that is either a string[] or an object with a "format" and "files" properties.',
      )
      process.exit(1)
    }
    if (
      config.github.archives.prefix &&
      (typeof config.github.archives.prefix !== 'string' ||
        config.github.archives.prefix.trim() === '')
    ) {
      console.error(
        'Config validation error: "github.archives.prefix" must be a string if provided.',
      )
      process.exit(1)
    }
    if (
      config.github.archives.extraFiles &&
      (!Array.isArray(config.github.archives.extraFiles) ||
        config.github.archives.extraFiles.some((file) => !isFileGlob(file)))
    ) {
      console.error(
        'Config validation error: "github.archives.extraFiles" must be an array of non-empty strings or FileGlob object with "cwd" and "pattern" properties if provided.',
      )
      process.exit(1)
    }
    if (config.github.release && typeof config.github.release !== 'object') {
      console.error(
        'Config validation error: "github.release" must be an object if provided.',
      )
      process.exit(1)
    }
  }
}

export async function loadConfig(
  configFileName: string,
  setValues: string[] = [],
): Promise<Config> {
  if (!configFileName || configFileName.trim() === '') {
    console.error('Invalid configuration file path.')
    process.exit(1)
  }
  const extension = configFileName.split('.').at(-1)
  if (extension !== 'yaml' && extension !== 'yml') {
    console.error(
      'Configuration file must be a YAML file with .yaml or .yml extension.',
    )
    process.exit(1)
  }

  const configPath = join(process.cwd(), configFileName)
  const configFile = Bun.file(configPath)
  if (!(await configFile.exists())) {
    console.error(`Configuration file not found at path: ${configPath}`)
    process.exit(1)
  }

  let configText = await configFile.text()

  try {
    configText = replaceEnvVars(configText)
  } catch (err) {
    // @ts-expect-error
    console.error(`Error processing config, '${configPath}': ${err.message}`)
    process.exit(1)
  }

  const config = Bun.YAML.parse(configText) as Config

  const setObject = setArrayToObject(setValues)
  mergeObjs(config, setObject)

  await validateConfig(config)

  return config
}
