#!/usr/bin/env node
/**
 * CLI wrapper around {@link module:lib/buildDocs} — generates documentation for
 * the installed modules. Accepts `--rootDir`, `--outputDir` and `--verbose`.
 */
import buildDocs from '../lib/buildDocs.js'

function getArg (name) {
  const idx = process.argv.indexOf(name)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined
}

buildDocs({
  rootDir: getArg('--rootDir'),
  outputDir: getArg('--outputDir'),
  verbose: process.argv.includes('--verbose')
})
  .then(() => process.exit())
  .catch(e => {
    console.log(e)
    process.exit(1)
  })
