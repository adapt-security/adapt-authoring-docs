#!/usr/bin/env node
/**
 * Generates an HTTP server for viewing the local copy of the documentation (note these must be build first with `at-docgen`)
 */
import { App } from 'adapt-authoring-core'
import { spawn } from 'child_process'
import http from 'http-server'
import path from 'path'
/*
function getMime (filePath) {
  const ext = path.parse(filePath).ext
  return {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
  }[ext] || 'text/plain'
}
*/
process.env.NODE_ENV ??= 'production'
process.env.ADAPT_AUTHORING_LOGGER__mute = true

console.log('Starting app, please wait\n')
// TODO remove need to start app
App.instance.onReady().then(async app => {
  console.log('App started\n');
  (await app.waitForModule('server')).close() // close connections so we can still run the app separately

  const ROOT = path.resolve(app.config.get('adapt-authoring-docs.outputDir'))
  const PORT = 9000
  const OPEN = process.argv.some(a => a === '--open')

  const server = http.createServer({ root: ROOT, port: PORT })

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`
    console.log(`Docs hosted at ${url}`)

    if (OPEN) {
      const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      spawn(`${command} ${url}`, { shell: true })
        .on('error', e => console.log('spawn error', e))
    }
  })
})
