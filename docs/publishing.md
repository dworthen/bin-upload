# Publishing

One of the variables available in the configuration file is `gitTag`, a reference to the latest git tag on the current git branch that matches `v\d+\.\d+\.\d+` (the variable is without the leading `v`). Referencing this variable in the configuration allows for a git-based release process and bypasses the need to manually update version numbers when releasing.

## Local git-based Release Flow

### Requirements

Create a `.env` file with the following tokens.

```
# NPM granular access token that bypasses 2FA
# https://docs.npmjs.com/about-access-tokens
NPM_TOKEN="YOUR NPM TOKEN"
# GitHub token with repository metadata read and
# contents write permissions
GITHUB_TOKEN="YOUR GITHUB TOKEN"
PYPI_TOKEN="YOUR PYPI TOKEN"
```

Ensure your [config](/configuration) references the above tokens. Now run the following to publish.

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

### With CLI Overrides

Instead of referencing environment variables in your config file, you may also use the CLI:

```sh
bin-upload pack -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0
bin-upload publish \
-s "npm.publish.registry\=https://registry\.npmjs\.org/" \
-s "npm.publish.//registry\.npmjs\.org/:_authToken\=YOUR_NPM_TOKEN" \
-s "pypi.publish.token=YOUR_PYPI_TOKEN" \
-s "github.token=YOUR_GH_TOKEN" \
-s "github.release.tag_name=v1.0.0"
```

More on how to override config values via the CLI [here](configuration?id=setting-config-values-via-cli).

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

## Verify

Once published, install from npm or PyPI and confirm:

```sh
# npm
npx YOUR_PACKAGE ...

# PyPI
uvx YOUR_PACKAGE ...
```
