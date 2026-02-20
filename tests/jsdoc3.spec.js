import assert from 'node:assert/strict'
import { describe, it, afterEach } from 'node:test'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

/**
 * The jsdoc3 module generates JSDoc documentation. Its main export function
 * requires a fully initialised app, configs, and runs npx jsdoc.
 * We test writeConfig indirectly by checking the generated config file,
 * and getSourceIncludes through the config output.
 */

describe('jsdoc3', () => {
  let tmpDir

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  describe('getSourceIncludes (tested indirectly)', () => {
    it('should include lib/**/*.js files from config rootDirs', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))
      const srcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-src-'))

      // Create lib directory with JS files
      await fs.mkdirp(path.join(srcDir, 'lib'))
      await fs.writeFile(path.join(srcDir, 'lib', 'module.js'), '/** @class */ class Foo {}')

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: srcDir,
        module: false,
        includes: {}
      }]

      const mockApp = createMockApp()

      // We can check the generated config file to verify includes
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, {})
      } catch (e) {
        // jsdoc may fail due to missing files, but the config should still be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      const includes = config.source.include
      assert.ok(includes.some(f => f.endsWith('module.js')))

      await fs.rm(srcDir, { recursive: true, force: true })
    })

    it('should include index.js for configs marked as module', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))
      const srcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-src-'))

      await fs.writeFile(path.join(srcDir, 'index.js'), '/** @module */ export default class {}')

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: srcDir,
        module: true,
        includes: {}
      }]

      const mockApp = createMockApp()
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, {})
      } catch (e) {
        // jsdoc may fail but config should be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      const includes = config.source.include
      assert.ok(includes.some(f => f.endsWith('index.js')))

      await fs.rm(srcDir, { recursive: true, force: true })
    })

    it('should not include index.js for configs not marked as module', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))
      const srcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-src-'))

      await fs.mkdirp(path.join(srcDir, 'lib'))
      await fs.writeFile(path.join(srcDir, 'index.js'), '/** @module */ export default class {}')

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: srcDir,
        module: false,
        includes: {}
      }]

      const mockApp = createMockApp()
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, {})
      } catch (e) {
        // jsdoc may fail but config should be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      const includes = config.source.include
      assert.ok(!includes.some(f => f.endsWith('index.js')))

      await fs.rm(srcDir, { recursive: true, force: true })
    })

    it('should include sourceIndex page when provided', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: tmpDir,
        module: false,
        includes: {}
      }]

      const sourceIndex = '/some/path/to/source-index.js'
      const mockApp = createMockApp()
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, { sourceIndex })
      } catch (e) {
        // jsdoc may fail but config should be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      const includes = config.source.include
      assert.ok(includes.includes(sourceIndex))
    })
  })

  describe('writeConfig (tested indirectly)', () => {
    it('should write valid JSON config with expected structure', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: tmpDir,
        module: false,
        includes: {}
      }]

      const mockApp = createMockApp()
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, {})
      } catch (e) {
        // jsdoc may fail but config should be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      assert.ok(config.source)
      assert.ok(Array.isArray(config.source.include))
      assert.ok(config.docdash)
      assert.ok(config.docdash.collapse === true)
      assert.ok(config.docdash.search === true)
      assert.ok(config.opts)
      assert.ok(config.opts.destination.endsWith('/backend'))
    })

    it('should include app version in meta and menu', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'))

      const configs = []
      const mockApp = createMockApp('2.5.0')
      const configPath = path.resolve(
        path.dirname(new URL('../jsdoc3/jsdoc3.js', import.meta.url).pathname),
        '.jsdocConfig.json'
      )

      try {
        const { default: jsdoc3 } = await import('../jsdoc3/jsdoc3.js')
        await jsdoc3(mockApp, configs, tmpDir, {})
      } catch (e) {
        // jsdoc may fail but config should be written
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      assert.ok(config.docdash.meta.keyword.includes('2.5.0'))
      const menuHtml = Object.keys(config.docdash.menu)[0]
      assert.ok(menuHtml.includes('2.5.0'))
    })
  })
})

function createMockApp (version = '1.0.0') {
  return {
    pkg: { version }
  }
}
