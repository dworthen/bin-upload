# Commands

## `init`

Initialize a `bin-upload` configuration file via interactive prompts.

```sh
bin-upload init [options]
```

| Option         | Description                            |
| -------------- | -------------------------------------- |
| `--help, -h`   | Show help.                             |
| `--config, -c` | Path to output configuration file.     |
| `--force, -f`  | Overwrite existing configuration file. |

## `pack`

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

## `publish`

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
