import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { Glob } from 'bun'
import { type Archive } from '@/lib/archive/Archive'
import { createArchive } from '@/lib/archive/createArchive'
import { type Config, type FileGlob } from '@/lib/config'
import { getPackOutputDir } from '@/lib/paths'

type FileDescriptor = {
  fullPath: string
  relativePath: string
}

function getGithubArchiveName(config: Config, archiveId: string): string {
  const archiveConfig = config.github!.archives[archiveId]!
  if (typeof archiveConfig === 'string') {
    return `${archiveId}.${archiveConfig}`
  }

  return `${archiveId}.${archiveConfig.format}`
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
  const archiveConfig = config.github!.archives[archiveId]!

  const files: Array<string | FileGlob> = []

  if (typeof archiveConfig === 'string') {
    const relativeFilePath = config.binaries[archiveId]
    if (!relativeFilePath) {
      throw new Error(
        `Error building GitHub archive: No binary found for archiveId "${archiveId}". Please ensure "binaries" in your config includes a mapping for this archiveId.`,
      )
    }

    const absoluteFilePath = resolve(relativeFilePath)
    const cwd = dirname(absoluteFilePath)
    const pattern = basename(absoluteFilePath)

    files.push({ cwd, pattern })
  } else {
    files.push(...archiveConfig.files)
  }

  return getFileDescriptors(files)
}

async function addFileToArchive(
  archive: Archive,
  file: FileDescriptor,
): Promise<void> {
  const f = await readFile(file.fullPath)
  archive.addFile(f, file.relativePath)
}

export async function buildGithubArchive(
  config: Config,
  archiveId: string,
): Promise<number> {
  const archiveName = getGithubArchiveName(config, archiveId)
  const building = `Building GitHub archive ${archiveName}`

  try {
    console.log(building)

    const archiveConfig = config.github!.archives[archiveId]!
    const format =
      typeof archiveConfig === 'string' ? archiveConfig : archiveConfig.format
    const outputDir = await getPackOutputDir(config, 'github')
    const archivePath = resolve(outputDir, archiveName)
    const archive = createArchive(format, archivePath)
    const files = getFiles(config, archiveId)
    await Promise.all(files.map((file) => addFileToArchive(archive, file)))
    await archive.end()
    console.log(`Finished ${building.toLowerCase()}`)
    return 0
  } catch (error) {
    console.error(`Error building GitHub archive ${archiveName}: ${error}`)
    return 1
  }
}
