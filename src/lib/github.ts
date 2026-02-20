import { basename } from 'node:path'
import { Octokit } from '@octokit/rest'
import { type Config, type GithubReleaseOptions } from '@/lib/config'

let octokit: Octokit | null = null

export function getOctokit(token: string): Octokit {
  if (!octokit) {
    octokit = new Octokit({ auth: token })
  }
  return octokit
}

export type TagData = {
  name: string
  sha: string
  commitMessage: string
}

export async function getLatestTag(config: Config): Promise<TagData> {
  const octokit = getOctokit(config.github!.token)

  const tagData = (
    await octokit.request('GET /repos/{owner}/{repo}/tags', {
      owner: config.github!.owner,
      repo: config.github!.repo,
      per_page: 1,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  ).data[0]

  if (!tagData) {
    throw new Error(
      `No tags found for repository ${config.github!.owner}/${config.github!.repo}`,
    )
  }

  const tagName = tagData.name
  const tagSha = tagData.commit.sha

  const commitData = await octokit.request(
    'GET /repos/{owner}/{repo}/commits/{ref}',
    {
      owner: config.github!.owner,
      repo: config.github!.repo,
      ref: tagSha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  const commitMessage = commitData.data.commit.message

  return {
    name: tagName,
    sha: tagSha,
    commitMessage,
  }
}

export async function getReleaseOptions(
  config: Config,
): Promise<GithubReleaseOptions> {
  const releaseOptions = config.github!.release || {}

  if (
    !releaseOptions.tag_name ||
    !releaseOptions.name ||
    !releaseOptions.body
  ) {
    const latestTagData = await getLatestTag(config)

    releaseOptions.tag_name = releaseOptions.tag_name || latestTagData.name
    releaseOptions.name = releaseOptions.name || latestTagData.name
    releaseOptions.body = releaseOptions.body || latestTagData.commitMessage
  }

  return releaseOptions as GithubReleaseOptions
}

export async function getReleaseIdByTagName(
  config: Config,
  releaseOptions: GithubReleaseOptions,
): Promise<number | null> {
  const octokit = getOctokit(config.github!.token)

  try {
    const releaseData = await octokit.request(
      'GET /repos/{owner}/{repo}/releases/tags/{tag}',
      {
        owner: config.github!.owner,
        repo: config.github!.repo,
        tag: releaseOptions.tag_name,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    return releaseData.data.id
  } catch (error: any) {
    if (error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createRelease(
  config: Config,
  releaseOptions: GithubReleaseOptions,
): Promise<number> {
  const octokit = getOctokit(config.github!.token)

  const response = await octokit.request(
    'POST /repos/{owner}/{repo}/releases',
    {
      owner: config.github!.owner,
      repo: config.github!.repo,
      ...releaseOptions,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  return response.data.id
}

export async function getReleaseId(config: Config): Promise<number> {
  const releaseOptions = await getReleaseOptions(config)

  let releaseId = await getReleaseIdByTagName(config, releaseOptions)

  if (!releaseId) {
    releaseId = await createRelease(config, releaseOptions)
  }

  return releaseId
}

const assetsCache: Record<number, string[]> = {}

export async function getReleaseAssets(
  config: Config,
  releaseId: number,
): Promise<string[]> {
  if (assetsCache[releaseId]) {
    return assetsCache[releaseId]
  }

  try {
    const octokit = getOctokit(config.github!.token)

    const assetsData = await octokit.repos.listReleaseAssets({
      owner: config.github!.owner,
      repo: config.github!.repo,
      release_id: releaseId,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    const assetNames = assetsData.data.map((asset) => asset.name)
    assetsCache[releaseId] = assetNames
    return assetNames
  } catch {
    assetsCache[releaseId] = []
    return []
  }
}

export async function uploadReleaseAsset(
  config: Config,
  releaseId: number,
  assetPath: string,
): Promise<number> {
  const assetName = basename(assetPath)
  const existingAssets = await getReleaseAssets(config, releaseId)

  if (existingAssets.includes(assetName)) {
    console.warn(
      `GitHub asset ${assetName} already exists for release ${releaseId}. Skipping upload.`,
    )
    return 0
  }

  const octokit = getOctokit(config.github!.token)

  const file = Bun.file(assetPath)

  console.log(`Uploading GitHub asset ${assetName} to release ${releaseId}...`)

  try {
    await octokit.repos.uploadReleaseAsset({
      owner: config.github!.owner,
      repo: config.github!.repo,
      release_id: releaseId,
      name: assetName,
      // @ts-expect-error
      data: file,
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size,
      },
    })

    console.log(
      `Finished uploading GitHub asset ${assetName} to release ${releaseId}.`,
    )
    return 0
  } catch (error: any) {
    if (error.status === 422) {
      console.warn(
        `GitHub asset ${assetName} already exists for release ${releaseId}. Skipping upload.`,
      )
      return 0
    } else {
      console.error(
        `Error uploading GitHub asset ${assetName} for release ${releaseId}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return 1
    }
  }
}
