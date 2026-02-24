#!/usr/bin/env node

import meow from 'meow'
import { init } from '@/commands/init'
import { pack } from '@/commands/pack'
import { publish } from '@/commands/publish'

const commands: Record<string, (argv: string[]) => Promise<void>> = {
  init: init,
  pack: pack,
  publish: publish,
}

process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('👋 until next time!')
  } else {
    throw error
  }
})

const cli = meow(
  `
  Usage
    $ bin-upload <command> [options]

  Commands
    init      Initialize a bin-upload configuration file.
    pack      Produce artifacts (e.g. npm packages, pypi packages, etc) to publish based on the configuration file.
    publish   Publish the package artifacts.
    
  Options
    --help, -h      Show global or command specific help.
    --version, -v   Show version number.

  Examples
    $ bin-upload pack
    $ bin-upload publish
`,
  {
    version: '0.0.12',
    importMeta: import.meta,
    flags: {
      help: {
        type: 'boolean',
        shortFlag: 'h',
      },
      version: {
        type: 'boolean',
        shortFlag: 'v',
      },
    },
    autoHelp: false,
    autoVersion: false,
    argv: process.argv.slice(2),
  },
)

if (cli.flags.help && cli.input.length === 0) {
  cli.showHelp()
  process.exit(1)
}

if (cli.flags.version) {
  cli.showVersion()
  process.exit(1)
}

if (cli.input.length === 0) {
  console.error('No command provided.')
  cli.showHelp()
  process.exit(1)
}

const commandName = cli.input[0]!
const command = commands[commandName]

if (!command) {
  console.error(`Unknown command: ${commandName}`)
  cli.showHelp()
  process.exit(1)
}

const args = [...process.argv.slice(2)]
const commandIndex = args.indexOf(commandName)
if (commandIndex !== -1) {
  args.splice(commandIndex, 1)
}
await command(args)
