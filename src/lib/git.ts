import { $ } from 'bun'

export async function getLatestGitVersionTag(): Promise<string | null> {
  try {
    const tag = (
      await $`git describe --tags --match "v[0-9]*.[0-9]*.[0-9]*" --abbrev=0`.text()
    )
      .slice(1)
      .trim()
    if (!/^\d+\.\d+\.\d+$/.test(tag)) {
      return null
    }
    return tag
  } catch {
    return null
  }
}
