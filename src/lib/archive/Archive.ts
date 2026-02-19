export interface Archive {
  addFile(
    contents: string | Buffer,
    archivePath: string,
  ): [string, string, string]
  end(): Promise<void>
}
