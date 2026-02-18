import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function getTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(await realpath(tmpdir()), 'bu-'))
  return tempDir
}
