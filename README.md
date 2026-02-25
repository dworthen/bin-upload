# Bin Upload

> Easily distribute binaries via npm, pypi, and GitHub releases.

`bin-upload` is a CLI tool built with [Bun](https://bun.sh) that packages and publishes pre-built binaries to multiple registries and platforms. It supports:

- **npm** — Publishes a main package that depends on platform-specific binary packages using [optionalDependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#optionaldependencies).
- **PyPI** — Builds wheel (`.whl`) packages for each platform-specific tag.
- **GitHub Releases** — Creates releases and uploads archive assets (`.tar.gz` or `.zip`).

[Full documentation](https://dworthen.github.io/bin-upload/).
