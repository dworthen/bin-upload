import { TarArchive } from '@/lib/archive/TarArchive'
import { ZipArchive } from '@/lib/archive/ZipArchive'
import { type ArchiveFormat } from '@/lib/config'

export function createArchive(format: ArchiveFormat, archivePath: string) {
  if (format === 'zip') {
    return new ZipArchive(archivePath)
  } else if (format === 'tar.gz') {
    return new TarArchive(archivePath)
  }
  throw new Error(`Unsupported archive format for path: ${archivePath}`)
}
