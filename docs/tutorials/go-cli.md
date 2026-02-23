# Tutorial: Go CLI

This tutorial walks through creating, packing, and publishing a Go CLI tool with `bin-upload`.

We'll build a CLI called **env-print** that prints the value of an environment variable:

```
env-print PATH
# => /usr/local/bin:/usr/bin:...
```

## Prerequisites

- [Go](https://go.dev/) installed
- [bin-upload](/quick-start) installed

## 1. Create the Project

```sh
mkdir env-print-go && cd env-print-go
go mod init github.com/youruser/env-print
```

## 2. Write the CLI

Create `main.go` with the following contents. No external dependencies are needed.

```go
// main.go
package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: env-print <VARIABLE_NAME>")
		os.Exit(1)
	}

	name := os.Args[1]
	value, ok := os.LookupEnv(name)
	if !ok {
		fmt.Fprintf(os.Stderr, "Environment variable %q is not set.\n", name)
		os.Exit(1)
	}

	fmt.Println(value)
}
```

Test it locally:

```sh
go run main.go PATH
```

## 3. Cross-Compile Binaries

Go's built-in cross-compilation makes it easy to produce binaries for every platform:

```sh
GOOS=linux GOARCH=amd64 go build -o bin/linux-x64/env-print main.go
GOOS=linux GOARCH=arm64 go build -o bin/linux-arm64/env-print main.go
GOOS=darwin GOARCH=amd64 go build -o bin/darwin-x64/env-print main.go
GOOS=darwin GOARCH=arm64 go build -o bin/darwin-arm64/env-print main.go
GOOS=windows GOARCH=amd64 go build -o bin/win-x64/env-print.exe main.go
```

This produces a `bin/` directory with a standalone binary for each target:

```
bin/
├── linux-x64/env-print
├── linux-arm64/env-print
├── darwin-x64/env-print
├── darwin-arm64/env-print
└── win-x64/env-print.exe
```

## 4. Initialize bin-upload

```sh
bin-upload init
```

Walk through the interactive prompts, or create a `bin-upload.config.yaml` manually:

```yaml
binaries:
  linux-x64: "./bin/linux-x64/env-print"
  linux-arm64: "./bin/linux-arm64/env-print"
  darwin-x64: "./bin/darwin-x64/env-print"
  darwin-arm64: "./bin/darwin-arm64/env-print"
  win-x64: "./bin/win-x64/env-print.exe"

pack:
  dir: "./dist"

npm:
  readmeFile: "README.md"
  licenseFile: "LICENSE"
  packageJson:
    name: "@my-scope/env-print"
    version: <%= vars.gitTag %>
    description: "Print the value of an environment variable."
    license: "MIT"
  binaryPackages:
    linux-x64:
      name: "@my-scope/env-print-linux-x64"
      os: "linux"
      arch: "x64"
    linux-arm64:
      name: "@my-scope/env-print-linux-arm64"
      os: "linux"
      arch: "arm64"
    darwin-x64:
      name: "@my-scope/env-print-darwin-x64"
      os: "darwin"
      arch: "x64"
    darwin-arm64:
      name: "@my-scope/env-print-darwin-arm64"
      os: "darwin"
      arch: "arm64"
    win-x64:
      name: "@my-scope/env-print-win-x64"
      os: "win32"
      arch: "x64"
  publish:
    access: "public"
    tag: "latest"

pypi:
  readmeFile: "README.md"
  platformTags:
    linux-x64: "manylinux_2_17_x86_64"
    linux-arm64: "manylinux_2_17_aarch64"
    darwin-x64: "macosx_10_9_x86_64"
    darwin-arm64: "macosx_11_0_arm64"
    win-x64: "win_amd64"
  metadata:
    Name: "env-print"
    Version: <%= vars.gitTag %>
    Summary: "Print the value of an environment variable."
    License-Expression: "MIT"
    Requires-Python: ">=3.11"

github:
  owner: "my-user"
  repo: "env-print"
  token: "<%= env.GITHUB_TOKEN %>"
  release:
    tag_name: "v<%= vars.gitTag %>"
  archives:
    linux-x64: "tar.gz"
    linux-arm64: "tar.gz"
    darwin-x64: "tar.gz"
    darwin-arm64: "tar.gz"
    win-x64: "zip"
```

> **Note:** Replace `@my-scope`, `my-user`, and other placeholder values with your own.

## 5. Pack

```sh
bin-upload pack
```

This generates the `dist/` directory with npm tarballs, PyPI wheels, and GitHub archives:

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
