import { type Config } from '@/lib/config'
import { objToCliArgs } from '@/lib/objects'

export async function uploadToNpm(
  config: Config,
  archivePath: string,
): Promise<number> {
  console.log(`Publishing npm package ${archivePath}...`)

  const publishArgs = objToCliArgs(config.npm!.publish || {})
  console.log(`npm publish arguments: ${publishArgs.join(' ')}`)
  const textDecoder = new TextDecoder()
  const proc = Bun.spawn(['npm', 'publish', ...publishArgs, archivePath])
  for await (const chunk of proc.stdout) {
    process.stdout.write(textDecoder.decode(chunk))
  }

  if (proc.stderr) {
    // @ts-expect-error
    for await (const chunk of proc.stderr) {
      process.stderr.write(textDecoder.decode(chunk))
    }
  }

  console.log(`Finished publishing npm package ${archivePath}.`)

  return await proc.exited
}
