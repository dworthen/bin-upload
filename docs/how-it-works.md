# How it Works

## npm

The `pack` command generates:

- A **main package** that detects the user's platform (`process.platform` + `process.arch`) and delegates to the appropriate binary package.
- **Platform-specific packages** listed as `optionalDependencies` in the main package, each containing the binary for that platform.

Bin upload publishes a main npm package that depends on platform-specific binary packages using [optionalDependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#optionaldependencies). When the main package is installed, the corresponding platform-specific package containing the actual binary is also installed. This allows for downloading and installing only the necessary binary without relying on post-install scripts, which some package managers do not run for dependencies.

> **Note:** musl Linux binaries cannot be distinguished from glibc Linux binaries via `process.platform`/`process.arch`, so they cannot be published to npm.

## PyPI

The `pack` command builds platform-specific wheel (`.whl`) files. Each wheel contains:

- A Python wrapper module that locates and executes the bundled binary.
- Console script entry points for CLI usage.

Bin upload builds and publishes wheel (`.whl`) packages for each platform-specific tag. Only one PyPI package is created containing the platform-specific wheel files (unlike npm where each binary is published to its own npm package). Tools such as `pip` and `uv` automatically install the correct wheel for the machine installing the package.

## GitHub Releases

The `pack` command creates `.tar.gz` or `.zip` archives. The `publish` command creates a GitHub release (if one doesn't exist for the tag) and uploads the archives as release assets.

## Publishing

The [npm](https://www.npmjs.com/) CLI is used to publish to npm while [uv](https://docs.astral.sh/uv/) is used to publish to [PyPI](https://pypi.org/).
