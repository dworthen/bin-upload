export const configTemplate = `binaries:
  # binaryId -> path to binary file
  linux-x64: "./bin/linux-x64/bin-upload"
  linux-x64-musl: "./bin/linux-x64-musl/bin-upload"
  linux-arm64: "./bin/linux-arm64/bin-upload"
  linux-arm64-musl: "./bin/linux-arm64-musl/bin-upload"
  win-x64: "./bin/win-x64/bin-upload.exe"
  win-arm64: "./bin/win-arm64/bin-upload.exe"
  darwin-x64: "./bin/darwin-x64/bin-upload"
  darwin-arm64: "./bin/darwin-arm64/bin-upload"
pack:
  # prePackCommand: "bun run build"
  dir: "./dist"
<%- if (npm) { %>
npm:
  # readme and license files to include in the npm packages.
  readmeFile: "README.md"
  licenseFile: "LICENSE"
  packageJson:
    # packageJson values
    # https://docs.npmjs.com/cli/v11/configuring-npm/package-json
    # The name is the name of the primary npm package users install.
    name: "<%= npm.name %>"
    version: <%= '<%= vars.gitTag %>' %>
<%- if (npm.description) { %>
    description: "<%= npm.description %>"
<%- } %>
<%- if (npm.author) { %>
    author: "<%= npm.author %>"
<%- } %>
<%- if (npm.license) { %>
    license: "<%= npm.license %>"
<%- } %>
<%- if (npm.repository) { %>
    repository: "<%= npm.repository %>"
<%- } -%>
<%- if (npm.keywords) { %>
    keywords:
<%- npm.keywords.forEach(keyword => { %>
      - "<% = keyword %>"
<%- }) %>
<%- } %>
  binaryPackages:
    # A subset of binaryIds that should be published as separate packages on npm.
    # binaryId -> { name, os, arch }
    # as defined by node's process.platform and process.arch
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processplatform
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processarch
    # The os and arch values must match a valid combination of process.platform and process.arch.
    # Therefore publishing musl linux binaries to npm is not possible since
    # there is no way to differentiate them from glibc linux binaries using process.platform and process.arch.
    # These packages will be dependencies of the main package.
    linux-x64:
      name: "<%= npm.name %>-linux-x64"
      os: "linux"
      arch: "x64"
    linux-arm64:
      name: "<%= npm.name %>-linux-arm64"
      os: "linux"
      arch: "arm64"
    win-x64:
      name: "<%= npm.name %>-win-x64"
      os: "win32"
      arch: "x64"
    win-arm64:
      name: "<%= npm.name %>-win-arm64"
      os: "win32"
      arch: "arm64"
    darwin-x64:
      name: "<%= npm.name %>-darwin-x64"
      os: "darwin"
      arch: "x64"
    darwin-arm64:
      name: "<%= npm.name %>-darwin-arm64"
      os: "darwin"
      arch: "arm64"
  publish:
    # Arguments to pass to \`npm publish\`
    # https://docs.npmjs.com/cli/v11/commands/npm-publish
    access: "public"
    tag: "latest"
    # Publishing with granular access token
    # Not needed if publishing from a trusted publisher
    # such as GitHub actions.
    # https://docs.npmjs.com/trusted-publishers
    "registry=https://registry.npmjs.org/": true
    "//registry.npmjs.org/:_authToken=<%= '<%= env.NPM_TOKEN %>' %>": true
    # may also set with CLI args e.g.,
    # bin-upload publish -s "npm.publish.registry=https://registry.npmjs.org/" -s "npm.publish.//registry.npmjs.org/:_authToken=some-token"
<%- } %>
<%- if (pypi) { %>
pypi:
  # readme file to include in the pypi package.
  readmeFile: "README.md"
  platformTags:
    # A subset of binaryIds that should be published to pypi.
    # binaryId: pypi platform tag
    # The pypi platform tag must be a valid wheel platform tag.
    # https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/
    linux-x64: "manylinux_2_17_x86_64"
    linux-x64-musl: "musllinux_1_2_x86_64"
    linux-arm64: "manylinux_2_17_aarch64"
    linux-arm64-musl: "musllinux_1_2_aarch64"
    win-x64: "win_amd64"
    win-arm64: "win_arm64"
    darwin-x64: "macosx_10_9_x86_64"
    darwin-arm64: "macosx_11_0_arm64"
  metadata:
    # Metadata fields for the pypi package.
    # https://packaging.python.org/en/latest/specifications/core-metadata/
    # Metadata-Version is automatically set to 2.5 by the pack command.
    Name: "<%= pypi.name %>"
    Version: <%= '<%= vars.gitTag %>' %>
<%- if (pypi.summary) { %>
    Summary: "<%= pypi.summary %>"
<%- } %>
<%- if (pypi.author) { %>
    Author: "<%= pypi.author %>"
<%- } %>
<%- if (pypi.license) { %>
    License-Expression: "<%= pypi.license %>"
<%- } %>
    Requires-Python: ">=3.11"
<%- if (pypi.projectUrl) { %>
    Project-URL: "source, <%= pypi.projectUrl %>"
<%- } %>
<%- if (pypi.keywords) { %>
    keywords: "<%= pypi.keywords.join(',') %>"
<%- } %>
  publish:
    # Arguments to pass to \`uv publish\`
    # https://docs.astral.sh/uv/guides/package/
    # Token not needed if publishing from a trusted publisher such as GitHub actions.
    # https://docs.pypi.org/trusted-publishers/adding-a-publisher/
    token: "<%= '<%= env.PYPI_TOKEN %>' %>"
    # may aslo set with CLI args e.g.,
    # bin-upload publish -s "pypi.publish.token=some-token"
<%- } %>
<%- if (gh) { %>
github:
  owner: "<%= gh.owner %>"
  repo: "<%= gh.repo %>"
  token: "<%= '<%= env.GITHUB_TOKEN %>' %>"
  release:
    # Arguments to pass to gh release api
    # https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release
    # if !name -> use tag_name
    # if !body -> use commit message of associated tag
    # may also set with CLI args e.g.,
    # bin-upload publish -s "github.release.tag_name=v1.0.0" -s "github.release.body=Some description" ...
    tag_name: "v<%= '<%= vars.gitTag %>' %>"
    # name: "v1.0.0"
    # body: "Release v1.0.0"
    # draft: true
  archives:
    # archiveName -> { format, files }
    # format can be "tar.gz" or "zip"
    # files is an array of file patterns to include in the archive.
    # If the archiveName matches a binaryId and only contains the binary file, 
    # then the shorthand
    # binaryId -> format 
    # can be used instead of specifying the files.
    linux-x64: "tar.gz"
    linux-x64-musl: "tar.gz"
    linux-arm64: "tar.gz"
    linux-arm64-musl: "tar.gz"
    win-x64: "zip"
    win-arm64: "zip"
    darwin-x64: "tar.gz"
    darwin-arm64: "tar.gz"
    # Example of more control of creating archives
    # generates source.tar.gz to upload tp github releases.
    # source:
    #   format: "tar.gz"
    #   files:
    #     # Place all the files in src directly in the root of the archive.
    #     - cwd: "src"
    #       pattern: "**/*"
    #     # Place all the files in scripts in the archive keeping the scripts directory.
    #     - cwd: "."
    #       pattern: "scripts/**/*"
    #     - "README.md"
    #     - "LICENSE"
<%- } %>`
