import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import archiver from 'archiver'
import { type Config } from '@/lib/config'
import { binIndexJs, mainPkgIndexJs } from '@/templates/npm'
import { renderString } from '@/templates/renderString'

declare var self: Worker

type BuildNpmPackageMessage = {
  config: Config
  binaryId?: string
}

function tarballName(config: Config, binaryId?: string): string {
  const baseName = config
    .npm!.packageJson.name.replace(/@/g, '')
    .replace(/\//g, '-')
  const version = config.npm!.packageJson.version
  return binaryId
    ? `${baseName}-${binaryId}-${version}.tgz`
    : `${baseName}-${version}.tgz`
}

function packageName(config: Config, binaryId?: string): string {
  return binaryId
    ? `${config.npm!.packageJson.name}-${binaryId}`
    : config.npm!.packageJson.name
}

async function outDir(config: Config): Promise<string> {
  const dir = join(process.cwd(), config.pack.dir, 'npm')
  await mkdir(dir, { recursive: true })
  return dir
}

function constructBinaryPaths(
  binaryNames?: string[],
): string | Record<string, string> {
  if (!binaryNames || binaryNames.length === 0) {
    return 'index.js'
  }

  return binaryNames.reduce<Record<string, string>>((acc, name) => {
    acc[name] = `index.js`
    return acc
  }, {})
}

function constructPackageJson(config: Config, binaryId?: string): string {
  const pkgJson = config.npm!.packageJson
  pkgJson.name = packageName(config, binaryId)
  pkgJson.version = config.npm!.packageJson.version
  pkgJson.type = 'module'
  pkgJson.exports = {
    '.': {
      import: './index.js',
    },
    './package.json': './package.json',
  }
  pkgJson.files = ['package.json', 'index.js']

  if (config.npm!.readmeFile && config.npm!.readmeFile.trim() !== '') {
    // @ts-expect-error
    pkgJson.files.push(basename(config.npm!.readmeFile))
  }

  if (config.npm!.licenseFile && config.npm!.licenseFile.trim() !== '') {
    // @ts-expect-error
    pkgJson.files.push(basename(config.npm!.licenseFile))
  }

  if (!binaryId) {
    pkgJson.bin = constructBinaryPaths(config.npm!.binaryNames)

    pkgJson.optionalDependencies = Object.keys(
      config.npm!.binaryPackages,
    ).reduce<Record<string, string>>((acc, binId) => {
      const optionalPackageName = packageName(config, binId)
      acc[optionalPackageName] = `${config.npm!.packageJson.version}`
      return acc
    }, {})
  } else {
    const binInfo = config.npm!.binaryPackages[binaryId]
    if (!binInfo) {
      postMessage({
        type: 'error',
        message: `Error constructing package.json: No binary package info found for binaryId "${binaryId}". Please ensure "npm.binaryPackages" in your config includes a mapping for this binaryId.`,
      })
      process.exit(1)
    }
    pkgJson.os = [binInfo.os]
    pkgJson.cpu = [binInfo.arch]
    // @ts-expect-error
    pkgJson.files.push('bin')
  }

  return JSON.stringify(pkgJson, undefined, 2)
}

function constructBinIndexJs(config: Config, binaryId: string): string {
  const binFilename = basename(config.binaries[binaryId]!)

  return renderString(binIndexJs, {
    binFilename,
  })
}

function constructMainIndexJs(config: Config): string {
  const packages = Object.keys(config.npm!.binaryPackages).map((binId) => {
    return [binId, packageName(config, binId)]
  })

  return renderString(mainPkgIndexJs, {
    packages,
  })
}

function constructIndexJs(config: Config, binaryId?: string): string {
  if (binaryId) {
    return constructBinIndexJs(config, binaryId)
  }

  return constructMainIndexJs(config)
}

self.addEventListener(
  'message',
  async (event: { data: BuildNpmPackageMessage }) => {
    const { config, binaryId } = event.data

    const tarball = tarballName(config, binaryId)
    const pkgName = packageName(config, binaryId)

    const building = `Building npm package ${pkgName}.`

    try {
      postMessage({
        type: 'log',
        message: building,
      })

      const outDirPath = await outDir(config)
      const archivePath = join(outDirPath, tarball)
      const outputStream = createWriteStream(archivePath)
      const archive = archiver('tar', {
        gzip: true,
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

      archive.append(constructPackageJson(config, binaryId), {
        name: 'package/package.json',
      })
      archive.append(constructIndexJs(config, binaryId), {
        name: 'package/index.js',
      })

      if (config.npm!.readmeFile && config.npm!.readmeFile.trim() !== '') {
        const filePath = join(process.cwd(), config.npm!.readmeFile)
        const filename = basename(filePath)
        const file = Bun.file(filePath)
        archive.append(await file.text(), {
          name: `package/${filename}`,
        })
      }

      if (config.npm!.licenseFile && config.npm!.licenseFile.trim() !== '') {
        const filePath = join(process.cwd(), config.npm!.licenseFile)
        const filename = basename(filePath)
        const file = Bun.file(filePath)
        archive.append(await file.text(), {
          name: `package/${filename}`,
        })
      }

      if (binaryId) {
        const filename = basename(config.binaries[binaryId]!)
        const binFile = join(process.cwd(), config.binaries[binaryId]!)
        archive.append(createReadStream(binFile), {
          name: `package/bin/${filename}`,
        })
      }

      await archive.finalize()

      // process.exit(0)
    } catch (error) {
      postMessage({
        type: 'error',
        message: `Error ${building.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`,
      })
      process.exit(1)
    }
  },
)
