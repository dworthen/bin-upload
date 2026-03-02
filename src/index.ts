#!/usr/bin/env node

import { createCommand } from '@d-dev/roar'
import { initCommand } from '@/commands/init'
import { packCommand } from '@/commands/pack'
import { publishCommand } from '@/commands/publish'
import pkg from '../package.json'

process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('👋 until next time!')
  } else {
    throw error
  }
})

const cli = createCommand({
  usageName: 'bin-upload',
  version: pkg.version,
  description: pkg.description,
  versionFlag: ['version', 'v'],
  helpFlag: ['help', 'h'],
})

cli.addCommand('init', initCommand)
cli.addCommand('pack', packCommand)
cli.addCommand('publish', publishCommand)

await cli.run(process.argv.slice(2))
