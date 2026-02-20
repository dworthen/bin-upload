import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Config } from '@/lib/config'

export type PackSource = 'npm' | 'pypi' | 'github'
export async function getPackOutputDir(
  config: Config,
  source?: PackSource,
): Promise<string> {
  const baseDir = config.pack?.dir ? config.pack.dir : 'dist'

  const dir = resolve(baseDir, source ?? '')
  await mkdir(dir, { recursive: true })
  return dir
}
