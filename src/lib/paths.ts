import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Config } from '@/lib/config'

export type PackSource = 'npm' | 'pypi' | 'github'
export async function getPackOutputDir(
  config: Config,
  source: PackSource,
): Promise<string> {
  const dir = resolve(config.pack.dir, source)
  await mkdir(dir, { recursive: true })
  return dir
}

export function getGithubArchiveName(
  config: Config,
  archiveId: string,
): string {
  const archiveConfig = config.github!.archives.formats[archiveId]!
  const prefix = config.github!.archives.prefix || ''
  if (typeof archiveConfig === 'string') {
    return `${prefix}${archiveId}.${archiveConfig}`
  }

  return `${archiveId}.${archiveConfig.format}`
}
