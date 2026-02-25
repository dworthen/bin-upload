export const configTemplate = `binaries:
  # binaryId -> path to binary file
<%- binaries.forEach(([binaryId, info]) => { %>
  <%= binaryId %>: "<%= info.path %>"
<%- }) %>
pack:
  # prePackCommand: "bun run build" # Optional command to run before packing
  dir: "./.bin-upload" # Output directory for packed artifacts
<%- if (npm) { %>
npm:
  readmeFile: "README.md"
  licenseFile: "LICENSE"
  packageJson:
    # packageJson values
    # https://docs.npmjs.com/cli/v11/configuring-npm/package-json
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
    # binaryId -> { name, os, arch } using Node.js process.platform/process.arch values
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processplatform
    # https://nodejs.org/docs/latest-v24.x/api/process.html#processarch
    # Note: It is not possible to publish musl linux binaries to
    # NPM since you cannot identify binaries using musl with platform/arch.
<%- npmBinaries.forEach(([binaryId, info]) => { %>
    <%= binaryId %>:
      name: "<%= npm.name %>-<%= binaryId %>"
      os: "<%= info.os %>"
      arch: "<%= info.arch %>"
<%- }) %>
  publish:
    # Arguments to pass to \`npm publish\`
    # https://docs.npmjs.com/cli/v11/commands/npm-publish
    access: "public"
    tag: "latest"
    # Publishing with granular access token
    # Not needed if publishing from a trusted publisher
    # https://docs.npmjs.com/trusted-publishers
    "registry=https://registry.npmjs.org/": true
    "//registry.npmjs.org/:_authToken=<%= '<%= env.NPM_TOKEN %>' %>": true
    # may also set with CLI args e.g.,
    # bin-upload publish -s "npm.publish.registry\\=https://registry\\.npmjs\\.org/" -s "npm.publish.//registry\\.npmjs\\.org/:_authToken\\=some-token"
<%- } %>
<%- if (pypi) { %>
pypi:
  # readme file to include in the pypi package.
  readmeFile: "README.md"
  platformTags:
    # binaryId -> wheel platform tag
    # https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/
<%- binaries.forEach(([binaryId, info]) => { %>
    <%= binaryId %>: "<%= info.tag %>"
<%- }) %>
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
    #
    # Publishing with granular access token
    # Not needed if publishing from a trusted publisher
    # https://docs.pypi.org/trusted-publishers/adding-a-publisher/
    token: "<%= '<%= env.PYPI_TOKEN %>' %>"
    # may aslo set with CLI args e.g.,
    # bin-upload publish -s "pypi.publish.token=some-token"
<%- } %>
<%- if (gh) { %>
github:
  owner: "<%= gh.owner %>"
  repo: "<%= gh.repo %>"
  # Token should have the following repository level permissions
  # Metadata read
  # Contents read and write
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
  archives:
    # Simple: binaryId -> format
<%- binaries.forEach(([binaryId, info]) => { %>
    <%= binaryId %>: "<%= info.format %>"
<%- }) %>
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
