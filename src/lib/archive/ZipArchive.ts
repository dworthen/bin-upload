import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { dirname } from 'node:path'
import yazl from 'yazl'
import { type Archive } from '@/lib/archive/Archive'

export class ZipArchive implements Archive {
  private declare archive: yazl.ZipFile
  private declare output: WriteStream

  public constructor(archivePath: string) {
    const dir = dirname(archivePath)
    mkdirSync(dir, { recursive: true })
    this.archive = new yazl.ZipFile()
    this.output = createWriteStream(archivePath)
    this.archive.outputStream.pipe(this.output)
  }

  public addFile(
    contents: string | Buffer,
    archivePath: string,
  ): [string, string, string] {
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
    this.archive.addBuffer(buffer, archivePath)
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(buffer)
    const hash = hasher.digest('base64url')
    return [archivePath, hash, buffer.length.toString()]
  }

  public async end(): Promise<void> {
    const promise = new Promise((resolve) => {
      this.output.on('close', resolve)
    })
    await this.archive.end()
    await promise
  }
}
