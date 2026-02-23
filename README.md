# Bin Upload

Easily distribute binaries via npm, pypi, and GitHub releases.

## Overview

`bin-upload` is a CLI tool built with [Bun](https://bun.sh) that packages and publishes pre-built binaries to multiple registries and platforms. It supports:

- **npm** — Publishes a main package that depend on platform-specific binary packages using [optionalDependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#optionaldependencies).
- **PyPI** — Builds wheel (`.whl`) packages for each platform-specific tag.
- **GitHub Releases** — Creates releases and uploads archive assets (`.tar.gz` or `.zip`).

## Installation

### From npm

```sh
# Globally
npm install -g @d-dev/bin-upload
# or as a package dep
npm install -D @d-dev/bin-upload
# or run with npx
npx @d-dev/bin-upload <command>
```

### From PyPI

```sh
pip install bin-upload
# or with UV
uv tool install bin-upload
# or run with uvx
uvx bin-upload <command>
```

### From GitHub Releases

Download the appropriate binary for your platform from the [releases page](https://github.com/dworthen/bin-upload/releases).

## Quick Start

**Requirements**

The following must be installed and available on your path.

- [npm](https://www.npmjs.com/): if publishing to npm
- [uv](https://docs.astral.sh/uv/): if publishing to pypi

1. **Initialize a configuration file:**

   ```sh
   bin-upload init
   ```

   This will walk you through an interactive prompt and generate a `bin-upload.config.yaml` file.

2. **Pack binaries into publishable artifacts:**

   ```sh
   bin-upload pack
   ```

   This will generate artifacts that can be published to npm (tarballs), pypi (wheel), and GitHub (tarballs and zips).

3. **Publish the artifacts:**

   ```sh
   bin-upload publish
   ```

   This publishes the artifacts generatd by the `pack` command.

## Commands

### `init`

Initialize a `bin-upload` configuration file via interactive prompts.

```sh
bin-upload init [options]
```

| Option         | Description                            |
| -------------- | -------------------------------------- |
| `--help, -h`   | Show help.                             |
| `--config, -c` | Path to output configuration file.     |
| `--force, -f`  | Overwrite existing configuration file. |

### `pack`

Build publishable artifacts (npm tarballs, PyPI wheels, GitHub archives) from your binaries.

```sh
bin-upload pack [options]
```

| Option         | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `--help, -h`   | Show help.                                                             |
| `--config, -c` | Path to YAML configuration file. Default: `bin-upload.config.yaml`.    |
| `--set, -s`    | Set configuration values, e.g., `--set npm.packageJson.version=1.0.0`. |
| `--source`     | Sources to pack: `all`, `npm`, `pypi`, `github`. Default: `all`.       |
| `--verbose`    | Enable verbose logging.                                                |

### `publish`

Publish the packed artifacts to their respective registries.

```sh
bin-upload publish [options]
```

| Option         | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `--help, -h`   | Show help.                                                             |
| `--config, -c` | Path to YAML configuration file. Default: `bin-upload.config.yaml`.    |
| `--set, -s`    | Set configuration values, e.g., `--set pypi.publish.token=some-token`. |
| `--source`     | Sources to publish: `all`, `npm`, `pypi`, `github`. Default: `all`.    |
| `--verbose`    | Enable verbose logging.                                                |

## Configuration

The configuration file is a YAML file (default: `bin-upload.config.yaml`) that supports [Eta](https://eta.js.org/docs/4.x.x/intro/quickstart) templating with access to environment variables and built-in variables.

### Template Variables

- `env` — Access environment variables, e.g., `<%= env.NPM_TOKEN %>`.
- `vars.gitTag` — The latest semver git tag (without the `v` prefix), extracted from tags matching `v*.*.*`.

### Configuration Structure

```yaml
binaries:
  # binaryId -> path to binary file
  linux-x64: "./bin/linux-x64/my-binary"
  darwin-arm64: "./bin/darwin-arm64/my-binary"
  win-x64: "./bin/win-x64/my-binary.exe"

pack:
  prePackCommand: "bun run build" # Optional command to run before packing
  dir: "./dist" # Output directory for packed artifacts

npm:
  readmeFile: "README.md"
  licenseFile: "LICENSE"
  packageJson:
    name: "@scope/my-package"
    version: <%= vars.gitTag %>
    description: "My binary package"
    license: "MIT"
  binaryPackages:
    # binaryId -> { name, os, arch } using Node.js process.platform/process.arch values
    linux-x64:
      name: "@scope/my-package-linux-x64"
      os: "linux"
      arch: "x64"
    darwin-arm64:
      name: "@scope/my-package-darwin-arm64"
      os: "darwin"
      arch: "arm64"
    win-x64:
      name: "@scope/my-package-win-x64"
      os: "win32"
      arch: "x64"
  binNames:
    - "my-binary" # Optional custom bin entry point names
  publish:
    access: "public"
    tag: "latest"
    # For publishing from local machine
    # Should omit if publishing from GitHub actions
    # using trusted publisher with npm
    "registry=https://registry.npmjs.org/": true
    "//registry.npmjs.org/:_authToken=<%= env.NPM_TOKEN %>": true

pypi:
  readmeFile: "README.md"
  platformTags:
    # binaryId -> wheel platform tag
    linux-x64: "manylinux_2_17_x86_64"
    darwin-arm64: "macosx_11_0_arm64"
    win-x64: "win_amd64"
  metadata:
    Name: "my-package"
    Version: <%= vars.gitTag %>
    Summary: "My binary package"
    Requires-Python: ">=3.11"
  entryPointNames:
    - "my-binary" # Optional custom console_scripts entry points
  publish:
    # For publishing from local machine
    # should omit if publishing from GitHub actions
    # using trusted publisher with pypi
    token: "<%= env.PYPI_TOKEN %>"

github:
  owner: "my-org"
  repo: "my-repo"
  # Token should have the following repository level permissions
  # Metadata read
  # Contents read and write
  token: "<%= env.GITHUB_TOKEN %>"
  release:
    tag_name: "v<%= vars.gitTag %>"
  archives:
    # Simple: binaryId -> format
    linux-x64: "tar.gz"
    win-x64: "zip"
    # Advanced: custom archive with file globs
    # source:
    #   format: "tar.gz"
    #   files:
    #     - cwd: "src"
    #       pattern: "**/*"
    #     - "README.md"
```

### Setting Config Values via CLI

Use `--set` (`-s`) to override configuration values using dot notation:

```sh
bin-upload pack -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0
bin-upload publish -s "pypi.publish.token=some-token"
```

This will create the following values in the yaml configuration.

```yaml
npm
  packageJson
    version: 1.0.0

pypi
  metadata
    Version: 1.0.0
```

Escape dots and equals signs with backslashes when they are part of the key:

```sh
bin-upload publish -s "npm.publish.registry\=https://registry\.npmjs\.org/=true"
```

This will create the following values in the yaml configuration.

```yaml
npm
  publish
    "registry=https://registry.npmjs.org/": true
```

## How it Works

### npm

The `pack` command generates:

- A **main package** that detects the user's platform (`process.platform` + `process.arch`) and delegates to the appropriate binary package.
- **Platform-specific packages** listed as `optionalDependencies` in the main package, each containing the binary for that platform.

Bin upload publishes a main npm package that depend on platform-specific binary packages using [optionalDependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#optionaldependencies). When the main package is installed, the corresponding platform-specific package containing the actual binary is also installed. This allows for downloading and installing only the necessary binary without relying on post-install scripts, which some package managers do not run for dependencies.

> **Note:** musl Linux binaries cannot be distinguished from glibc Linux binaries via `process.platform`/`process.arch`, so they cannot be published to npm.

### PyPI

The `pack` command builds platform-specific wheel (`.whl`) files. Each wheel contains:

- A Python wrapper module that locates and executes the bundled binary.
- Console script entry points for CLI usage.

Bin upload builds and published wheel (`.whl`) packages for each platform-specific tag. Only one PyPi package is created containing the platform-specific wheel files (unlike npm where each binary is published to its own npm package). Tools such as `pip` and `uv` automatically install the correct wheel for the machine installing the package.

### GitHub Releases

The `pack` command creates `.tar.gz` or `.zip` archives. The `publish` command creates a GitHub release (if one doesn't exist for the tag) and uploads the archives as release assets.

### Publishing

The [npm](https://www.npmjs.com/) cli is used to publish to npm while [uv](https://docs.astral.sh/uv/) is used to publish to [PyPi](https://pypi.org/).

## Environment Variables

| Variable       | Used By                     |
| -------------- | --------------------------- |
| `NPM_TOKEN`    | npm publish authentication  |
| `PYPI_TOKEN`   | PyPI publish authentication |
| `GITHUB_TOKEN` | GitHub API authentication   |

These can be set in a `.env` file or your CI environment. When using trusted publishers (e.g., GitHub Actions OIDC), tokens may not be required.

## Publishing

One of the variables available for reference in the configuration file is `gitTag`, a reference to the latest git tag on the current git branch that matches `v\d+\.\d+\.\d+` (the variable is without the leading `v`). Referencing this variable in the configuration allows for git-based release process and bypasses the need to manually update version numbers when releasing.

### Local git-based Release Flow

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

### Publishing with GitHub actions

The following GitHub action will publish the binary artifacts whenever a version tag is pushed to the repo. You will need to establish trusted publishing between the GitHub repo and npm and/or pypi if publishing to those locations.

```yaml
# .github/workflows/relesae.yml
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

From here, the release process is similar to releasing from local machine

```sh
git add .
git commit -m "..."
git tag -a v1.0.0 -m "Release v1.0.0"
git push --follow-tags
```

## Development

This project uses [Bun](https://bun.sh) as its runtime and build tool.

```sh
# Install dependencies
bun install

# Build binaries for all platforms
bun run build

# Build for a specific target
bun run ./scripts/build.ts bun-darwin-arm64

# Lint and format
bun run check
bun run fix
```

## License

[MIT](LICENSE) — Copyright (c) Derek Worthen
