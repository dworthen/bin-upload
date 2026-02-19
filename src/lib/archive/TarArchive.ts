import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { dirname } from 'node:path'
import archiver from 'archiver'

export class TarArchive {
  private declare archive: archiver.Archiver
  private declare output: WriteStream
  private declare archivePath: string
  private declare files: Record<string, Buffer>

  public constructor(archivePath: string) {
    const dir = dirname(archivePath)
    mkdirSync(dir, { recursive: true })

    this.output = createWriteStream(archivePath)
    this.archive = archiver('tar', { gzip: true })
    this.archive.pipe(this.output)

    this.archivePath = archivePath
    this.files = {}
  }

  public addFile(
    contents: string | Buffer,
    archivePath: string,
  ): [string, string, string] {
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
    this.archive.append(buffer, { name: archivePath })
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(buffer)
    const hash = hasher.digest('base64url')
    return [archivePath, hash, buffer.length.toString()]
  }

  public async end(): Promise<void> {
    const promise = new Promise((resolve) => {
      this.output.on('close', resolve)
    })
    await this.archive.finalize()
    await promise
  }
}
