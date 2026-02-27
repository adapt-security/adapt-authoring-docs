#!/usr/bin/env node
/**
 * Generates an HTTP server for viewing the local copy of the documentation (note these must be built first with `at-docgen`)
 */
import { spawn } from 'child_process'
import http from 'http-server'
import path from 'path'

function getArg (name) {
  const idx = process.argv.indexOf(name)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined
}

async function getOutputDir () {
  const arg = getArg('--outputDir')
  if (arg) return path.resolve(arg)
  const { default: StaticAppContext } = await import('../lib/StaticAppContext.js')
  const rootDir = path.resolve(getArg('--rootDir') || process.cwd())
  const app = await StaticAppContext.init(rootDir)
  return path.resolve(app.config.get('adapt-authoring-docs.outputDir'))
}

const ROOT = await getOutputDir()
const PORT = Number(getArg('--port')) || 9000
const OPEN = process.argv.some(a => a === '--open')

const server = http.createServer({ root: ROOT, cache: -1 })

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log(`Docs hosted at ${url}`)

  if (OPEN) {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(`${command} ${url}`, { shell: true })
      .on('error', e => console.log('spawn error', e))
  }
})
