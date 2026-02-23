# Tutorial: Bun CLI

This tutorial walks through creating, packing, and publishing a Bun CLI tool to npm, PyPi, and GitHub releases using `bin-upload`.

We'll build a CLI called **env-print** that prints the value of an environment variable:

```
env-print PATH
# => /usr/local/bin:/usr/bin:...
```

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

```sh
bun add -D @d-dev/bin-upload
bun run bin-upload init
```

Walk through the interactive prompts, or create a `bin-upload.config.yaml` manually:

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

## 5. Pack

Add a pack run script to `package.json`.

```json
{
  ...
  "scripts": {
      "build": "bun run build.ts",
      "pack": "bin-upload pack"
    }
}
```

and run

```sh
bun run pack
```

This generates the `.bin-upload/` directory with npm tarballs, PyPI wheels, and GitHub archives:

```
dist/
├── github/
│   ├── env-print-linux-x64.tar.gz
│   ├── env-print-linux-arm64.tar.gz
│   ├── env-print-darwin-x64.tar.gz
│   ├── env-print-darwin-arm64.tar.gz
│   └── env-print-win-x64.zip
├── npm/
│   ├── my-scope-env-print-1.0.0.tgz
│   ├── my-scope-env-print-linux-x64-1.0.0.tgz
│   ├── my-scope-env-print-linux-arm64-1.0.0.tgz
│   ├── my-scope-env-print-darwin-x64-1.0.0.tgz
│   ├── my-scope-env-print-darwin-arm64-1.0.0.tgz
│   └── my-scope-env-print-win-x64-1.0.0.tgz
└── pypi/
    ├── env_print-1.0.0-py3-none-manylinux_2_17_x86_64.whl
    ├── env_print-1.0.0-py3-none-manylinux_2_17_aarch64.whl
    ├── env_print-1.0.0-py3-none-macosx_10_9_x86_64.whl
    ├── env_print-1.0.0-py3-none-macosx_11_0_arm64.whl
    └── env_print-1.0.0-py3-none-win_amd64.whl
```

## 6. Test Locally

### npm

```sh
mkdir test-npm && cd test-npm
npm init -y
npm install ../dist/npm/my-scope-env-print-linux-x64-1.0.0.tgz
npm install ../dist/npm/my-scope-env-print-1.0.0.tgz
npx env-print PATH
```

### PyPI

```sh
uv init test-pypi
cd test-pypi
uv add ../dist/pypi/env_print-1.0.0-py3-none-manylinux_2_17_x86_64.whl
uv run env-print PATH
```

> **Note:** Use the platform-specific `.tgz` / `.whl` that matches your current machine.

## 7. Publish

Initialize a git repo, tag a release, and publish:

```sh
git init
git add .
git commit -m "Initial commit"
git tag -a v1.0.0 -m "Release v1.0.0"
git remote add origin https://github.com/my-user/env-print.git
git push -u origin main --follow-tags
bin-upload pack
bin-upload publish
```

## 8. Verify

Once published, install from npm or PyPI and confirm:

```sh
# npm
npx @my-scope/env-print PATH

# PyPI
uvx env-print PATH
```
