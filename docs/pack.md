# Pack

The `pack` command builds publishable artifacts from your binaries.

```sh
bin-upload pack
```

> **Note:** If not using git, you may need to specify config values for `npm.packageJson.version` and `pypi.metadata.Version` in your `bin-upload.config.yaml` config file or set the values via CLI, e.g., `bin-upload pack -s npm.packageJson.version=1.0.0 -s pypi.metadata.Version=1.0.0`.

**Pack specific sources**

```sh
bin-upload pack --source npm
bin-upload pack --source pypi
bin-upload pack --source github
```

## Generated Output

Running `bin-upload pack` creates a `.bin-upload/` directory (configurable via `pack.dir`) containing artifacts for each configured source:

```
.bin-upload/
├── github/
│   ├── darwin-arm64.tar.gz
│   ├── linux-x64.tar.gz
│   └── win-x64.zip
├── npm/
│   ├── scope-my-package-1.0.0.tgz           # Main package
│   ├── scope-my-package-darwin-arm64-1.0.0.tgz # Platform package
│   ├── scope-my-package-linux-x64-1.0.0.tgz
│   └── scope-my-package-win-x64-1.0.0.tgz
└── pypi/
    ├── my_package-1.0.0-py3-none-manylinux_2_17_x86_64.whl
    ├── my_package-1.0.0-py3-none-macosx_11_0_arm64.whl
    └── my_package-1.0.0-py3-none-win_amd64.whl
```

- **npm** — A main `.tgz` tarball and one `.tgz` per platform-specific binary package.
- **PyPI** — One `.whl` wheel file per platform tag.
- **GitHub** — One `.tar.gz` or `.zip` archive per binary.

## Testing Locally

Before publishing, you can test the generated packages locally to make sure everything works.

### Testing npm Packages

Create a new directory and install the platform package first, then the main package:

```sh
mkdir test-npm && cd test-npm
npm init -y
npm install path/to/dist/npm/scope-my-package-linux-x64-1.0.0.tgz
npm install path/to/dist/npm/scope-my-package-1.0.0.tgz
npx my-package
```

> **Note:** Replace the `.tgz` paths and `my-binary` with your actual file paths and bin name.

### Testing PyPI Wheel Packages

Use [uv](https://docs.astral.sh/uv/) to test the wheel package:

```sh
uv init test-pypi
cd test-pypi
uv add path/to/dist/pypi/my_package-1.0.0-py3-none-manylinux_2_17_x86_64.whl
uv run my-package
```

> **Note:** Replace the `.whl` path and `my-binary` with your actual file path and entry point name.
