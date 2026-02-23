# Pack

The `pack` command builds publishable artifacts from your binaries.

```sh
bin-upload pack
```

## Generated Output

Running `bin-upload pack` creates a `dist/` directory (configurable via `pack.dir`) containing artifacts for each configured source:

```
dist/
├── github/
│   ├── my-package-linux-x64.tar.gz
│   ├── my-package-darwin-arm64.tar.gz
│   └── my-package-win-x64.zip
├── npm/
│   ├── scope-my-package-1.0.0.tgz           # Main package
│   ├── scope-my-package-linux-x64-1.0.0.tgz  # Platform package
│   ├── scope-my-package-darwin-arm64-1.0.0.tgz
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
npx my-binary --help
```

> **Note:** Replace the `.tgz` paths and `my-binary` with your actual file paths and bin name.

### Testing PyPI Wheel Packages

Use [uv](https://docs.astral.sh/uv/) to test the wheel package:

```sh
uv init test-pypi
cd test-pypi
uv add path/to/dist/pypi/my_package-1.0.0-py3-none-manylinux_2_17_x86_64.whl
uv run my-binary
```

> **Note:** Replace the `.whl` path and `my-binary` with your actual file path and entry point name.
