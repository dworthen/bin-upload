import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { createArchive } from '@/lib/archive/createArchive'
import { type Config } from '@/lib/config'
import { getPackOutputDir } from '@/lib/paths'
import { binIndexJs, mainPkgIndexJs } from '@/templates/npm'
import { renderString } from '@/templates/renderString'

declare var self: Worker

function packageName(config: Config, binaryId?: string): string {
  return binaryId
    ? config.npm!.binaryPackages[binaryId]!.name
    : config.npm!.packageJson.name
}

function tarballName(config: Config, binaryId?: string): string {
  return `${packageName(config, binaryId).replace(/@/g, '').replace(/\//g, '-')}-${config.npm!.packageJson.version}.tgz`
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
    pkgJson.bin = constructBinaryPaths(config.npm!.binNames)

    pkgJson.optionalDependencies = Object.keys(
      config.npm!.binaryPackages,
    ).reduce<Record<string, string>>((acc, binId) => {
      const optionalPackageName = packageName(config, binId)
      acc[optionalPackageName] = `${config.npm!.packageJson.version}`
      return acc
    }, {})
  } else {
    const binInfo = config.npm!.binaryPackages[binaryId]!
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
  const packages = Object.entries(config.npm!.binaryPackages).map(
    ([binId, d]) => {
      return [`${d.os}-${d.arch}`, packageName(config, binId)]
    },
  )

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

export async function buildNpmPackage(
  config: Config,
  binaryId?: string,
): Promise<number> {
  const tarball = tarballName(config, binaryId)
  const pkgName = packageName(config, binaryId)

  const building = `Building npm package ${pkgName}.`

  try {
    console.log(building)

    const outDirPath = await getPackOutputDir(config, 'npm')
    const archivePath = resolve(outDirPath, tarball)

    const archive = createArchive('tar.gz', archivePath)

    archive.addFile(
      constructPackageJson(config, binaryId),
      'package/package.json',
    )
    archive.addFile(constructIndexJs(config, binaryId), 'package/index.js')

    if (config.npm!.readmeFile && config.npm!.readmeFile.trim() !== '') {
      const filePath = resolve(config.npm!.readmeFile)
      const filename = basename(filePath)
      const file = await readFile(filePath)
      archive.addFile(file, `package/${filename}`)
    }

    if (config.npm!.licenseFile && config.npm!.licenseFile.trim() !== '') {
      const filePath = resolve(config.npm!.licenseFile)
      const filename = basename(filePath)
      const file = await readFile(filePath)
      archive.addFile(file, `package/${filename}`)
    }

    if (binaryId) {
      const filename = basename(config.binaries[binaryId]!)
      const binFile = resolve(config.binaries[binaryId]!)
      const file = await readFile(binFile)
      archive.addFile(file, `package/bin/${filename}`)
    }

    await archive.end()

    console.log(`Finished ${building.toLowerCase()}`)
    return 0
  } catch (error) {
    console.error(
      `Error ${building.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
  }
}
