# Configuration

The configuration file is a YAML file (default: `bin-upload.config.yaml`) that supports [Eta](https://eta.js.org/docs/4.x.x/intro/quickstart) templating with access to environment variables and built-in variables.

## Template Variables

- `env` — Access environment variables, e.g., `<%= env.NPM_TOKEN %>`.
- `vars.gitTag` — The latest semver git tag (without the `v` prefix), extracted from tags matching `v*.*.*`.

## Configuration Structure

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
