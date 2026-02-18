import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import archiver from 'archiver'
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
  const dir = join(process.cwd(), config.pack.dir, 'pypi')
  await mkdir(dir, { recursive: true })
  return dir
}

async function addInitPyToArchive(
  archive: archiver.Archiver,
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
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(contents)
  const hash = hasher.digest('base64url')
  const bytes = new TextEncoder().encode(contents).length

  archive.append(contents, {
    name: `${pkgName}/__init__.py`,
  })

  return [`${pkgName}/__init__.py`, hash, bytes.toString()]
}

async function addBin(
  archive: archiver.Archiver,
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
  binPath = join(process.cwd(), binPath)
  const binName = basename(binPath)
  const binFile = Bun.file(binPath)

  const pkgName = packageName(config)
  const hasher = new Bun.CryptoHasher('sha256')
  const bytes = await binFile.bytes()
  hasher.update(bytes)
  const hash = hasher.digest('base64url')

  archive.append(createReadStream(binPath), {
    name: `${pkgName}/bin/${binName}`,
  })

  return [`${pkgName}/bin/${binName}`, hash, bytes.length.toString()]
}

async function addEntryPoints(
  archive: archiver.Archiver,
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

  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(contents)
  const hash = hasher.digest('base64url')
  const bytes = new TextEncoder().encode(contents).length

  archive.append(contents, {
    name: `${dist}/entry_points.txt`,
  })

  return [`${dist}/entry_points.txt`, hash, bytes.toString()]
}

async function addMetadata(
  archive: archiver.Archiver,
  config: Config,
): Promise<[string, string, string]> {
  const metadataLines: string[] = ['Metadata-Version: 2.5']
  Object.entries(config.pypi!.metadata).forEach(([key, value]) => {
    metadataLines.push(`${key}: ${value}`)
  })

  if (config.pypi!.readmeFile) {
    const file = Bun.file(join(process.cwd(), config.pypi!.readmeFile))
    const readmeContents = await file.text()
    metadataLines.push(`Description-Content-Type: text/markdown`)
    metadataLines.push('')
    metadataLines.push(`${readmeContents}`)
  }

  const contents = metadataLines.join('\n')

  const dist = distName(config)
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(contents)
  const hash = hasher.digest('base64url')
  const bytes = new TextEncoder().encode(contents).length

  archive.append(contents, {
    name: `${dist}/METADATA`,
  })

  return [`${dist}/METADATA`, hash, bytes.toString()]
}

async function addWheelMetadata(
  archive: archiver.Archiver,
  config: Config,
  binaryId: string,
): Promise<[string, string, string]> {
  const contents = renderString(wheelMetadata, {
    tag: tag(config, binaryId),
  })
  const dist = distName(config)
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(contents)
  const hash = hasher.digest('base64url')
  const bytes = new TextEncoder().encode(contents).length

  archive.append(contents, {
    name: `${dist}/WHEEL`,
  })

  return [`${dist}/WHEEL`, hash, bytes.toString()]
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
      const archivePath = join(outDirPath, wheel)
      const outputStream = createWriteStream(archivePath)
      const archive = archiver('zip', {
        zlib: { level: 9 },
      })

      archive.on('error', (err) => {
        postMessage({
          type: 'error',
          message: `Error ${building.toLowerCase()}: ${err instanceof Error ? err.message : String(err)}`,
        })
        process.exit(1)
      })

      archive.on('warning', (err) => {
        postMessage({
          type: 'error',
          message: `Warning ${building.toLowerCase()}: ${err instanceof Error ? err.message : String(err)}`,
        })
      })

      outputStream.on('close', () => {
        postMessage({
          type: 'log',
          message: `Finished ${building.toLowerCase()}`,
        })
        process.exit(0)
      })

      archive.pipe(outputStream)

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

      archive.append(recordLines.join('\n'), {
        name: `${dist}/RECORD`,
      })

      await archive.finalize()
    } catch (err) {
      postMessage({
        type: 'error',
        message: `Error ${building.toLowerCase()}: ${err instanceof Error ? err.message : String(err)}`,
      })
      process.exit(1)
    }
  },
)
