# Publishing

One of the variables available for reference in the configuration file is `gitTag`, a reference to the latest git tag on the current git branch that matches `v\d+\.\d+\.\d+` (the variable is without the leading `v`). Referencing this variable in the configuration allows for a git-based release process and bypasses the need to manually update version numbers when releasing.

## Local git-based Release Flow

```sh
git add .
git commit -m "..."
git tag -a v1.0.0 -m "Release v1.0.0"
# The tag needs to exist in the remote
# in order for bin-upload to create a release
# for the tag and upload assets
git push --follow-tags
bin-upload pack
bin-upload publish
```

## Publishing with GitHub Actions

The following GitHub action will publish the binary artifacts whenever a version tag is pushed to the repo. You will need to establish trusted publishing between the GitHub repo and npm and/or pypi if publishing to those locations.

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"

      - name: Install uv
        uses: astral-sh/setup-uv@v7

      - name: Build binaries
        run: COMMAND TO BUILD YOUR BINARIES

      - name: Pack
        run: uvx bin-upload pack

      - name: Publish
        run: uvx bin-upload publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

With the above GitHub action, you no longer need to set auth or tokens in the `npm.publish` and `pypi.publish` sections. You still need to reference the `GITHUB_TOKEN` in the `github` portion of the config.

From here, the release process is similar to releasing from a local machine:

```sh
git add .
git commit -m "..."
git tag -a v1.0.0 -m "Release v1.0.0"
git push --follow-tags
```

## Environment Variables

| Variable       | Used By                     |
| -------------- | --------------------------- |
| `NPM_TOKEN`    | npm publish authentication  |
| `PYPI_TOKEN`   | PyPI publish authentication |
| `GITHUB_TOKEN` | GitHub API authentication   |

These can be set in a `.env` file or your CI environment. When using trusted publishers (e.g., GitHub Actions OIDC), tokens may not be required.
