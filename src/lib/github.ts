import { Octokit } from 'octokit'

let octokit: Octokit | null = null

export function getOctokit(token: string): Octokit {
  if (!octokit) {
    octokit = new Octokit({ auth: token })
  }
  return octokit
}
