import { mkdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { type Archive } from '@/lib/archive/Archive'
import { createArchive } from '@/lib/archive/createArchive'
import { type Config } from '@/lib/config'
import { initPy, wheelMetadata } from '@/templates/pypi'
import { renderString } from '@/templates/renderString'

declare var self: Worker
type BuildPyPiPackageMessage = {
  config: Config
  binaryId: string
}

function packageName(config: Config): string {
  return config.pypi!.metadata.Name.replace(/-/g, '_')
}

function tag(config: Config, binaryId: string): string {
  if (!config.pypi!.platformTags[binaryId]) {
    postMessage({
      type: 'error',
      message: `Error building PyPI package: No platform tag found for binaryId "${binaryId}". Please ensure "pypi.platformTags" in your config includes a mapping for this binaryId.`,
    })
    process.exit(1)
  }

  return `py3-none-${config.pypi!.platformTags[binaryId]}`
}

function version(config: Config): string {
  return config.pypi!.metadata.Version
}

function wheelName(config: Config, binaryId: string): string {
  const pkgName = packageName(config)
  const pkgVersion = version(config)
  const pkgTag = tag(config, binaryId)

  return `${pkgName}-${pkgVersion}-${pkgTag}.whl`
}

function distName(config: Config): string {
  const pkgName = packageName(config)
  const pkgVersion = version(config)
  return `${pkgName}-${pkgVersion}.dist-info`
}

async function outDir(config: Config): Promise<string> {
  const dir = resolve(config.pack.dir, 'pypi')
  await mkdir(dir, { recursive: true })
  return dir
}

async function addInitPyToArchive(
  archive: Archive,
  config: Config,
  binaryId: string,
): Promise<[string, string, string]> {
  const binPath = config.binaries[binaryId]
  if (!binPath) {
    postMessage({
      type: 'error',
      message: `Error building PyPI package: No binary path found for binaryId "${binaryId}". Please ensure "binaries" in your config includes a mapping for this binaryId.`,
    })
    process.exit(1)
  }
  const binName = basename(binPath)
  const contents = renderString(initPy, {
    binName,
  })

  const pkgName = packageName(config)
  return archive.addFile(contents, `${pkgName}/__init__.py`)
}

async function addBin(
  archive: Archive,
  config: Config,
  binaryId: string,
): Promise<[string, string, string]> {
  let binPath = config.binaries[binaryId]
  if (!binPath) {
    postMessage({
      type: 'error',
      message: `Error building PyPI package: No binary path found for binaryId "${binaryId}". Please ensure "binaries" in your config includes a mapping for this binaryId.`,
    })
    process.exit(1)
  }
  binPath = resolve(binPath)
  const binName = basename(binPath)

  const file = await readFile(binPath)
  const pkgName = packageName(config)
  return archive.addFile(file, `${pkgName}/bin/${binName}`)
}

async function addEntryPoints(
  archive: Archive,
  config: Config,
): Promise<[string, string, string]> {
  const dist = distName(config)
  const entryPoints: string[] = ['[console_scripts]']
  const name = config.pypi!.metadata.Name
  const pkgName = packageName(config)
  if (config.pypi!.entryPointNames) {
    config.pypi!.entryPointNames.forEach((entryPointName) => {
      entryPoints.push(`${entryPointName} = ${pkgName}.__init__:run`)
    })
  } else {
    entryPoints.push(`${name} = ${pkgName}.__init__:run`)
  }

  const contents = entryPoints.join('\n')

  return archive.addFile(contents, `${dist}/entry_points.txt`)
}

async function addMetadata(
  archive: Archive,
  config: Config,
): Promise<[string, string, string]> {
  const metadataLines: string[] = ['Metadata-Version: 2.5']
  Object.entries(config.pypi!.metadata).forEach(([key, value]) => {
    metadataLines.push(`${key}: ${value}`)
  })

  if (config.pypi!.readmeFile) {
    const file = Bun.file(resolve(config.pypi!.readmeFile))
    const readmeContents = await file.text()
    metadataLines.push(`Description-Content-Type: text/markdown`)
    metadataLines.push('')
    metadataLines.push(`${readmeContents}`)
  }

  const contents = metadataLines.join('\n')

  const dist = distName(config)
  return archive.addFile(contents, `${dist}/METADATA`)
}

async function addWheelMetadata(
  archive: Archive,
  config: Config,
  binaryId: string,
): Promise<[string, string, string]> {
  const contents = renderString(wheelMetadata, {
    tag: tag(config, binaryId),
  })
  const dist = distName(config)
  return archive.addFile(contents, `${dist}/WHEEL`)
}

self.addEventListener(
  'message',
  async (event: { data: BuildPyPiPackageMessage }) => {
    const { config, binaryId } = event.data

    const wheel = wheelName(config, binaryId)
    const dist = distName(config)

    const building = `Building PyPI package ${wheel}.`

    try {
      postMessage({
        type: 'log',
        message: building,
      })

      const outDirPath = await outDir(config)
      const archivePath = resolve(outDirPath, wheel)
      const archive = createArchive('zip', archivePath)

      const results = await Promise.all([
        addInitPyToArchive(archive, config, binaryId),
        addBin(archive, config, binaryId),
        addEntryPoints(archive, config),
        addMetadata(archive, config),
        addWheelMetadata(archive, config, binaryId),
      ])

      const recordLines = results.map(
        ([filePath, hash, size]) => `${filePath},sha256=${hash},${size}`,
      )
      recordLines.push(`${dist}/RECORD,,`)

      archive.addFile(recordLines.join('\n'), `${dist}/RECORD`)
      await archive.end()

      postMessage({
        type: 'log',
        message: `Finished ${building.toLowerCase()}`,
      })
      process.exit(0)
    } catch (err) {
      postMessage({
        type: 'error',
        message: `Error ${building.toLowerCase()}: ${err instanceof Error ? err.message : String(err)}`,
      })
      process.exit(1)
    }
  },
)
