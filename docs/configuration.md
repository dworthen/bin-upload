# Configuration

The configuration file is a YAML file (default: `bin-upload.config.yaml`) that supports [Eta](https://eta.js.org/docs/4.x.x/intro/quickstart) templating with access to environment variables and built-in variables.

## Template Variables

- `env` — Access environment variables, e.g., `<%= env.NPM_TOKEN %>`.
- `vars.gitTag` — The latest semver git tag (without the `v` prefix), extracted from tags matching `v\d+\.\d+\.\d+`.

## Configuration Structure

```yaml
binaries:
  # binaryId -> path to binary file
  linux-x64: "./bin/linux-x64/my-binary"
  darwin-arm64: "./bin/darwin-arm64/my-binary"
  win-x64: "./bin/win-x64/my-binary.exe"

pack:
  # prePackCommand: "bun run build" # Optional command to run before packing
  dir: "./.bin-upload" # Output directory for packed artifacts

npm:
  readmeFile: "README.md"
  licenseFile: "LICENSE"
  packageJson:
    # packageJson values
    # https://docs.npmjs.com/cli/v11/configuring-npm/package-json
    name: "@scope/my-package"
    version: <%= vars.gitTag %>
    description: "My binary package"
    license: "MIT"
  binaryPackages:
    # binaryId -> { name, os, arch } using Node.js process.platform/process.arch values
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processplatform
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processarch
    # Note: It is not possible to publish musl linux binaries to
    # NPM since you cannot identify binaries using musl with platform/arch.
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
  publish:
    # Arguments to pass to \`npm publish\`
    # https://docs.npmjs.com/cli/v11/commands/npm-publish
    access: "public"
    tag: "latest"
    # Publishing with granular access token
    # Not needed if publishing from a trusted publisher
    # https://docs.npmjs.com/trusted-publishers
    "registry=https://registry.npmjs.org/": true
    "//registry.npmjs.org/:_authToken=<%= env.NPM_TOKEN %>": true

pypi:
  readmeFile: "README.md"
  platformTags:
    # binaryId -> wheel platform tag
    # https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/
    linux-x64: "manylinux_2_17_x86_64"
    darwin-arm64: "macosx_11_0_arm64"
    win-x64: "win_amd64"
  metadata:
    # Metadata fields for the pypi package.
    # https://packaging.python.org/en/latest/specifications/core-metadata/
    # Metadata-Version is automatically set to 2.5 by the pack command.
    Name: "my-package"
    Version: <%= vars.gitTag %>
    Summary: "My binary package"
    Requires-Python: ">=3.11"
  publish:
    # Arguments to pass to \`uv publish\`
    # https://docs.astral.sh/uv/guides/package/
    #
    # Publishing with granular access token
    # Not needed if publishing from a trusted publisher
    # https://docs.pypi.org/trusted-publishers/adding-a-publisher/
    token: "<%= env.PYPI_TOKEN %>"

github:
  owner: "my-org"
  repo: "my-repo"
  # Token should have the following repository level permissions
  # Metadata read
  # Contents read and write
  token: "<%= env.GITHUB_TOKEN %>"
  release:
    # Arguments to pass to gh release api
    # https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release
    # if !name -> use tag_name
    # if !body -> use commit message of associated tag
    tag_name: "v<%= vars.gitTag %>"
    # name: "v1.0.0"
    # body: "Release notes."
  archives:
    # Simple: binaryId -> format
    linux-x64: "tar.gz"
    darwin-arm64: "tar.gz"
    win-x64: "zip"
    # Advanced: custom archive with file globs
    # source:
    #   format: "tar.gz"
    #   files:
    #     - cwd: "src"
    #       pattern: "**/*"
    #     - "README.md"
```

## Property Reference

### `binaries`

| Property   | Description                                                                                                                                  | Required | Default |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `binaries` | Object mapping binary IDs to file paths. Keys are user defined and referenced elsewhere in the config, values are paths to the binary files. | **Yes**  | —       |

### `pack` (Optional)

| Property              | Description                                                    | Required | Default         |
| --------------------- | -------------------------------------------------------------- | -------- | --------------- |
| `pack.prePackCommand` | Shell command to run before packing (e.g., `"bun run build"`). | No       | —               |
| `pack.dir`            | Output directory for packed artifacts.                         | No       | `".bin-upload"` |

### `npm` (Optional)

The entire `npm` section is optional. If provided, `packageJson.name`, `packageJson.version`, and `binaryPackages` are required.

| Property                       | Description                                                                                                                                                                                                                                           | Required | Default      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| `npm.packageJson.name`         | Name of the main npm package.                                                                                                                                                                                                                         | **Yes**  | —            |
| `npm.packageJson.version`      | Version of the npm package.                                                                                                                                                                                                                           | **Yes**  | —            |
| `npm.packageJson.*`            | Any additional [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) fields (e.g., `description`, `license`, `author`, `repository`, `keywords`).                                                                               | No       | —            |
| `npm.binaryPackages`           | Object mapping binary IDs to platform-specific npm package info. Each entry requires `name`, `os`, and `arch`.                                                                                                                                        | **Yes**  | —            |
| `npm.binaryPackages.<id>.name` | npm package name for this platform binary.                                                                                                                                                                                                            | **Yes**  | —            |
| `npm.binaryPackages.<id>.os`   | Value matching [`process.platform`](https://nodejs.org/docs/latest-v24.x/api/process.html#processplatform) (e.g., `"linux"`, `"darwin"`, `"win32"`).                                                                                                  | **Yes**  | —            |
| `npm.binaryPackages.<id>.arch` | Value matching [`process.arch`](https://nodejs.org/docs/latest-v24.x/api/process.html#processarch) (e.g., `"x64"`, `"arm64"`).                                                                                                                        | **Yes**  | —            |
| `npm.readmeFile`               | Path to a README file to include in npm packages.                                                                                                                                                                                                     | No       | —            |
| `npm.licenseFile`              | Path to a LICENSE file to include in npm packages.                                                                                                                                                                                                    | No       | —            |
| `npm.binNames`                 | Array of custom bin entry point names.                                                                                                                                                                                                                | No       | `"index.js"` |
| `npm.publish`                  | Object of flags passed to [`npm publish`](https://docs.npmjs.com/cli/v11/commands/npm-publish). Common keys: `access`, `tag`, registry and auth token entries. Not needed when using [trusted publishers](https://docs.npmjs.com/trusted-publishers). | No       | —            |

### `pypi` (Optional)

The entire `pypi` section is optional. If provided, `metadata.Name`, `metadata.Version`, and `platformTags` are required.

| Property                | Description                                                                                                                                                                                                                         | Required | Default |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `pypi.platformTags`     | Object mapping binary IDs to [wheel platform tags](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/) (e.g., `"manylinux_2_17_x86_64"`, `"macosx_11_0_arm64"`, `"win_amd64"`).                     | **Yes**  | —       |
| `pypi.metadata.Name`    | PyPI package name.                                                                                                                                                                                                                  | **Yes**  | —       |
| `pypi.metadata.Version` | PyPI package version.                                                                                                                                                                                                               | **Yes**  | —       |
| `pypi.metadata.*`       | Any additional [core metadata](https://packaging.python.org/en/latest/specifications/core-metadata/) fields (e.g., `Summary`, `Author`, `License-Expression`, `Requires-Python`). `Metadata-Version` is automatically set to `2.5`. | No       | —       |
| `pypi.readmeFile`       | Path to a README file to include in the wheel packages.                                                                                                                                                                             | No       | —       |
| `pypi.licenseFile`      | Path to a LICENSE file to include in the wheel packages.                                                                                                                                                                            | No       | —       |
| `pypi.entryPointNames`  | Array of custom `console_scripts` entry point names.                                                                                                                                                                                | No       | —       |
| `pypi.publish`          | Object of flags passed to [`uv publish`](https://docs.astral.sh/uv/guides/package/). Common key: `token`. Not needed when using [trusted publishers](https://docs.pypi.org/trusted-publishers/adding-a-publisher/).                 | No       | —       |

### `github` (Optional)

The entire `github` section is optional. If provided, `owner`, `repo`, `token`, `archives`, and `release` are required.

| Property                  | Description                                                                                                                                            | Required | Default                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------ |
| `github.owner`            | GitHub repository owner (user or org).                                                                                                                 | **Yes**  | —                                    |
| `github.repo`             | GitHub repository name.                                                                                                                                | **Yes**  | —                                    |
| `github.token`            | GitHub API token. Must have repository-level **Metadata: read** and **Contents: read & write** permissions.                                            | **Yes**  | —                                    |
| `github.release`          | Object of options passed to the [GitHub create release API](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release). | **Yes**  | —                                    |
| `github.release.tag_name` | Git tag for the release (e.g., `"v<%= vars.gitTag %>")`).                                                                                              | **Yes**  | —                                    |
| `github.release.name`     | Release title.                                                                                                                                         | No       | Value of `tag_name`                  |
| `github.release.body`     | Release notes body.                                                                                                                                    | No       | Commit message of the associated tag |
| `github.archives`         | Object mapping binary IDs to archive format (`"tar.gz"` or `"zip"`), or to an advanced archive descriptor with `format` and `files`.                   | **Yes**  | —                                    |

## Initializing

The `init` command walks users through creating a config file for the binary files they wish to publish.

```sh
bin-upload init
```

## Setting Config Values via CLI

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
