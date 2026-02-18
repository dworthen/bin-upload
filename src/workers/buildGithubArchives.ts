import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import archiver from 'archiver'
import { Glob } from 'bun'
import { type Config, type FileGlob } from '@/lib/config'
import { getGithubArchiveName, getPackOutputDir } from '@/lib/paths'

declare var self: Worker

type BuildGithubArchivesMessage = {
  config: Config
  archiveId: string
}

type FileDescriptor = {
  fullPath: string
  relativePath: string
}

function getFileDescriptors(files: Array<string | FileGlob>): FileDescriptor[] {
  return files.flatMap((file) => {
    const cwd = typeof file === 'string' ? process.cwd() : resolve(file.cwd)

    const pattern = typeof file === 'string' ? file : file.pattern

    const glob = new Glob(pattern)
    const matches: FileDescriptor[] = []

    for (const matchingPath of glob.scanSync({
      cwd,
      absolute: true,
      dot: true,
      onlyFiles: true,
    })) {
      matches.push({
        fullPath: matchingPath,
        relativePath: matchingPath.slice(cwd.length + 1),
      })
    }

    return matches
  })
}

function getFiles(config: Config, archiveId: string): FileDescriptor[] {
  const archiveConfig = config.github!.archives.formats[archiveId]!

  const files: Array<string | FileGlob> = []

  if (typeof archiveConfig === 'string') {
    const relativeFilePath = config.binaries[archiveId]
    if (!relativeFilePath) {
      postMessage({
        type: 'error',
        message: `Error building GitHub archive: No binary found for archiveId "${archiveId}". Please ensure "binaries" in your config includes a mapping for this archiveId.`,
      })
      process.exit(1)
    }

    const absoluteFilePath = join(process.cwd(), relativeFilePath)
    const cwd = dirname(absoluteFilePath)
    const pattern = basename(absoluteFilePath)

    files.push({ cwd, pattern })
    if (config.github!.archives.extraFiles) {
      files.push(...config.github!.archives.extraFiles)
    }
  } else {
    files.push(...archiveConfig.files)
  }

  return getFileDescriptors(files)
}

async function copyFiles(outputDir: string, config: Config): Promise<void> {
  if (config.github!.files) {
    const files = getFileDescriptors(config.github!.files)

    await Promise.all(
      files.map(async (file) => {
        const input = Bun.file(file.fullPath)
        const outputPath = join(outputDir, file.relativePath)
        const dir = dirname(outputPath)
        await mkdir(dir, { recursive: true })
        const output = Bun.file(outputPath)
        await Bun.write(output, input)
      }),
    )
  }
}

function createArchive(config: Config, archiveId: string): archiver.Archiver {
  const archiveConfig = config.github!.archives.formats[archiveId]!

  const format =
    typeof archiveConfig === 'string' ? archiveConfig : archiveConfig.format

  if (format === 'zip') {
    return archiver('zip')
  }

  return archiver('tar', {
    gzip: true,
  })
}

async function addFileToArchive(
  archive: archiver.Archiver,
  file: FileDescriptor,
): Promise<void> {
  archive.append(createReadStream(file.fullPath), {
    name: file.relativePath,
  })
}

self.addEventListener(
  'message',
  async (event: MessageEvent<BuildGithubArchivesMessage>) => {
    const { config, archiveId } = event.data

    const archiveName = getGithubArchiveName(config, archiveId)
    const building = `Building GitHub archive ${archiveName}`

    try {
      postMessage({
        type: 'log',
        message: building,
      })

      const outputDir = await getPackOutputDir(config, 'github')
      const archivePath = join(outputDir, archiveName)
      const outputStream = createWriteStream(archivePath)
      const archive = createArchive(config, archiveId)
      const files = getFiles(config, archiveId)

      // postMessage({
      //   type: 'log',
      //   message: JSON.stringify(files, undefined, 2),
      // })

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

      await Promise.all(files.map((file) => addFileToArchive(archive, file)))

      await copyFiles(outputDir, config)
      archive.finalize()
    } catch (error) {
      postMessage({
        type: 'error',
        message: `Error building GitHub archive ${archiveName}: ${error}`,
      })
    }
  },
)
