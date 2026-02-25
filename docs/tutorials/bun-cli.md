# Tutorial: Bun CLI

This tutorial walks through creating, packing, and publishing a Bun CLI tool to npm, PyPi, and GitHub releases using `bin-upload`.

We'll build a CLI called **env-print** that prints the value of an environment variable:

```
env-print PATH
# => /usr/local/bin:/usr/bin:...
```

## Resources

[Source code](https://github.com/dworthen/bin-upload/tree/main/examples/bun-env-print).

## Prerequisites

- [Bun](https://bun.sh) installed

## 1. Create the Project

Create a blank bun project.

```sh
mkdir bun-env-print && cd bun-env-print
bun init
```

## 2. Write the CLI

Replace the contents of `index.ts` with the following. The CLI takes one argument — an environment variable name — and prints its value.

```ts
// index.ts
const environmentVariableName = process.argv[2];

if (!environmentVariableName) {
  console.error(
    "Please provide the name of the environment variable to print.",
  );
  process.exit(1);
}

const value = process.env[environmentVariableName];

if (value === undefined) {
  console.error(
    `Environment variable "${environmentVariableName}" is not set.`,
  );
  process.exit(1);
}

console.log(value);
```

Test it locally:

```sh
bun run index.ts PATH
```

## 3. Build Binaries

Add the following to `build.ts`

```ts
// build.ts
import { resolve } from "node:path";

const builds: Record<string, string> = {
  "bun-linux-arm64": "bin/linux-arm64/bun-env-print",
  "bun-linux-arm64-musl": "bin/linux-arm64-musl/bun-env-print",
  "bun-linux-x64-modern": "bin/linux-x64/bun-env-print",
  "bun-linux-x64-musl-modern": "bin/linux-x64-musl/bun-env-print",
  "bun-windows-x64-modern": "bin/win-x64/bun-env-print",
  "bun-darwin-arm64": "bin/darwin-arm64/bun-env-print",
  "bun-darwin-x64": "bin/darwin-x64/bun-env-print",
};

async function buildTarget(target: string, outFile: string): Promise<void> {
  console.log(`Building for target: ${target}...`);
  await Bun.build({
    entrypoints: ["./index.ts"],
    compile: {
      // @ts-expect-error
      target,
      outfile: resolve(outFile),
      autoloadTsConfig: false,
      autoloadPackageJson: false,
      autoloadBunConfig: false,
      autoloadDotEnv: true,
    },
    minify: true,
    sourcemap: "linked",
    env: "disable",
  });
  console.log(`Built ${target} successfully! Output: ${outFile}`);
}

await Promise.all(
  Object.entries(builds).map(
    async ([target, outFile]) => await buildTarget(target, outFile),
  ),
);
```

This will build single-file executables for each target platform. View the [bun docs](https://bun.com/docs/bundler/executables) for more information on the available options.

Add a build run script to `package.json`.

```json
{
  ...
  "scripts": {
      "build": "bun run build.ts",
    }
}
```

Run

```sh
bun run build
```

This produces a `bin/` directory with a standalone binary for each target:

```
bin/
├── darwin-arm64/bun-env-print
├── darwin-x64/bun-env-print
├── linux-arm64/bun-env-print
├── linux-arm64-musl/bun-env-print
├── linux-x64/bun-env-print
├── linux-x64-musl/bun-env-print
└── win-x64/bun-env-print.exe
```

## 4. Initialize bin-upload

### Install

```sh
bun add -D @d-dev/bin-upload
```

### Add package.json Scripts

```json
{
  ...
  "scripts": {
      "build": "bun run build.ts",
      "pack": "bin-upload pack",
      "publish": "bin-upload publish"
    }
}
```

Copy the following config to `bin-upload.config.yaml` or run `bun run bin-upload init` to walk through the interactive config creation:

```yaml
binaries:
  linux-x64: "./bin/linux-x64/bun-env-print"
  linux-x64-musl: "./bin/linux-x64-musl/bun-env-print"
  linux-arm64: "./bin/linux-arm64/bun-env-print"
  linux-arm64-musl: "./bin/linux-arm64-musl/bun-env-print"
  win-x64: "./bin/win-x64/bun-env-print.exe"
  darwin-x64: "./bin/darwin-x64/bun-env-print"
  darwin-arm64: "./bin/darwin-arm64/bun-env-print"

pack:
  prePackCommand: "bun run build"
  dir: "./.bin-upload"

npm:
  readmeFile: "README.md"
  packageJson:
    name: "@d-dev/bun-env-print"
    version: <%= vars.gitTag %>
    description: "prints env variables"
    license: "MIT"
  binaryPackages:
    linux-x64:
      name: "@d-dev/bun-env-print-linux-x64"
      os: "linux"
      arch: "x64"
    linux-arm64:
      name: "@d-dev/bun-env-print-linux-arm64"
      os: "linux"
      arch: "arm64"
    win-x64:
      name: "@d-dev/bun-env-print-win-x64"
      os: "win32"
      arch: "x64"
    darwin-x64:
      name: "@d-dev/bun-env-print-darwin-x64"
      os: "darwin"
      arch: "x64"
    darwin-arm64:
      name: "@d-dev/bun-env-print-darwin-arm64"
      os: "darwin"
      arch: "arm64"
  publish:
    access: "public"
    tag: "latest"
    "registry=https://registry.npmjs.org/": true
    "//registry.npmjs.org/:_authToken=<%= env.NPM_TOKEN %>": true

pypi:
  readmeFile: "README.md"
  platformTags:
    linux-x64: "manylinux_2_17_x86_64"
    linux-x64-musl: "musllinux_1_2_x86_64"
    linux-arm64: "manylinux_2_17_aarch64"
    linux-arm64-musl: "musllinux_1_2_aarch64"
    win-x64: "win_amd64"
    darwin-x64: "macosx_10_9_x86_64"
    darwin-arm64: "macosx_11_0_arm64"
  metadata:
    Name: "bun-env-print"
    Version: <%= vars.gitTag %>
    Summary: "prints env variables"
    License-Expression: "MIT"
    Requires-Python: ">=3.11"
  publish:
    token: "<%= env.PYPI_TOKEN %>"

github:
  owner: "dworthen"
  repo: "bin-upload"
  token: "<%= env.GITHUB_TOKEN %>"
  release:
    tag_name: "v<%= vars.gitTag %>"
  archives:
    linux-x64: "tar.gz"
    linux-x64-musl: "tar.gz"
    linux-arm64: "tar.gz"
    linux-arm64-musl: "tar.gz"
    win-x64: "zip"
    darwin-x64: "tar.gz"
    darwin-arm64: "tar.gz"
```

> **Note:** Replace the package names and repo info in `npm`, `pypi`, and `github` with your package and repo information.

More on configuration [here](/configuration).

## 5. Pack

Run

```sh
bun run pack -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0
```

> **Note:** `-s npm.packageJson.version=1.0.0` and `-s pypi.metadata.Version=1.0.0` are used to set the version for both package types since they are currently set to `<%= vars.gitTag %>` in the config file. `vars.gitTag` resolves to the latest git tag on the current branch that matches `v\d+\.\d+\.\d+` and git has not yet been initialized nor have any git tags been applied to the repo so we manually override the config values.

This generates the `.bin-upload/` directory with npm tarballs, PyPI wheels, and GitHub archives:

```
dist/
├── github/
│   ├── darwin-arm64.tar.gz
│   ├── darwin-x64.tar.gz
│   ├── linux-arm64-musl.tar.gz
│   ├── linux-arm64.tar.gz
│   ├── linux-x64-musl.tar.gz
│   ├── linux-x64.tar.gz
│   └── win-x64.zip
├── npm/
│   ├── d-dev-bun-env-print-1.0.0.tgz
│   ├── d-dev-bun-env-print-darwin-arm64-1.0.0.tgz
│   ├── d-dev-bun-env-print-darwin-x64-1.0.0.tgz
│   ├── d-dev-bun-env-print-linux-arm64-1.0.0.tgz
│   ├── d-dev-bun-env-print-linux-x64-1.0.0.tgz
│   └── d-dev-bun-env-print-win-x64-1.0.0.tgz
└── pypi/
    ├── bun_env_print-1.0.0-py3-none-macosx_10_9_x86_64.whl
    ├── bun_env_print-1.0.0-py3-none-macosx_11_0_arm64.whl
    ├── bun_env_print-1.0.0-py3-none-manylinux_2_17_aarch64.whl
    ├── bun_env_print-1.0.0-py3-none-manylinux_2_17_x86_64.whl
    ├── bun_env_print-1.0.0-py3-none-musllinux_1_2_aarch64.whl
    ├── bun_env_print-1.0.0-py3-none-musllinux_1_2_x86_64.whl
    └── bun_env_print-1.0.0-py3-none-win_amd64.whl
```

More on the pack command [here](/pack).

## 6. Test Locally

### NPM

```sh
mkdir test-npm && cd test-npm
npm init -y
npm install ../bun-env-print/.bun-upload/npm/d-dev-bun-env-print-linux-x64-1.0.0.tgz
npm install ../bun-env-print/.bun-upload/npm/d-dev-bun-env-print-1.0.0.tgz
npx bun-env-print PATH
```

### Python with UV

```sh
uv init test-pypi
cd test-pypi
uv add ../bun-env-print/.bun-upload/pypi/bun_env_print-1.0.0-py3-none-manylinux_2_17_x86_64.whl
uv run bun-env-print PATH
```

> **Note:** Use the platform-specific `.tgz` / `.whl` that matches your current machine.

## 7. Publish

Initialize a git repo, tag a release, and publish:

```sh
git init
git add .
git commit -m "Initial commit"
git tag -a v1.0.0 -m "Release v1.0.0"
git remote add origin https://github.com/my-user/bun-env-print.git
git push -u origin main --follow-tags
bun run pack
bun run publish
```

More on the publish command, including how to publish with GitHub actions, can be viewed [here](/publish).

## 8. Verify

Once published, install from npm or PyPI and confirm:

```sh
# npm
npx @d-dev/bun-env-print PATH

# PyPI
uvx bun-env-print PATH
```
