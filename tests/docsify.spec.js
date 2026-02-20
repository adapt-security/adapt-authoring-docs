import assert from 'node:assert/strict'
import { describe, it, mock, afterEach } from 'node:test'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

/**
 * The docsify module's main export relies heavily on the app object and
 * external tools (npx docsify). We test the generateSectionTitle function
 * indirectly through integration with mocked configs, and validate the
 * overall output structure.
 */

describe('docsify', () => {
  let tmpDir

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  describe('generateSectionTitle (tested indirectly)', () => {
    it('should capitalise first letter and replace dashes with spaces in section sidebar', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir
      const docsSrcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-src-'))

      // Create a dummy docs/ directory with a markdown file
      await fs.mkdirp(path.join(docsSrcDir, 'docs'))
      await fs.writeFile(path.join(docsSrcDir, 'docs', 'test-page.md'), '# Test Page Title\nContent here')

      const mockApp = createMockApp({
        manualSections: {
          'getting-started': { title: 'Getting started' },
          'other-guides': { default: true }
        }
      })

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: docsSrcDir,
        includes: {}
      }]

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, configs, outputDir, {})

      const sidebar = await fs.readFile(path.join(outputDir, 'manual', '_sidebar.md'), 'utf8')
      // The section for 'other-guides' (default) should have title 'Other guides'
      assert.ok(sidebar.includes('Other guides'))

      await fs.rm(docsSrcDir, { recursive: true, force: true })
    })
  })

  describe('output structure', () => {
    it('should create manual directory with required files', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        manualSections: {
          'other-guides': { default: true }
        }
      })

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, [], outputDir, {})

      const manualDir = path.join(outputDir, 'manual')
      assert.ok((await fs.stat(manualDir)).isDirectory())
      assert.ok((await fs.stat(path.join(manualDir, 'index.html'))).isFile())
      assert.ok((await fs.stat(path.join(manualDir, '_sidebar.md'))).isFile())
    })

    it('should write sidebar with introduction link', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        manualSections: {
          'other-guides': { default: true }
        }
      })

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, [], outputDir, {})

      const sidebar = await fs.readFile(path.join(outputDir, 'manual', '_sidebar.md'), 'utf8')
      assert.ok(sidebar.includes('Introduction'))
      assert.ok(sidebar.includes('<ul class="intro">'))
    })

    it('should copy docs files and include them in sidebar', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir
      const docsSrcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-src-'))

      await fs.mkdirp(path.join(docsSrcDir, 'docs'))
      await fs.writeFile(path.join(docsSrcDir, 'docs', 'my-guide.md'), '# My Guide\nSome content')

      const mockApp = createMockApp({
        manualSections: {
          guides: { title: 'Guides', pages: [] },
          'other-guides': { default: true }
        }
      })

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: docsSrcDir,
        includes: {}
      }]

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, configs, outputDir, {})

      const sidebar = await fs.readFile(path.join(outputDir, 'manual', '_sidebar.md'), 'utf8')
      assert.ok(sidebar.includes('My Guide'))
      assert.ok(sidebar.includes('my-guide.md'))

      await fs.rm(docsSrcDir, { recursive: true, force: true })
    })

    it('should handle configs with manualPages mapping', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir
      const docsSrcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-src-'))

      await fs.mkdirp(path.join(docsSrcDir, 'docs'))
      await fs.writeFile(path.join(docsSrcDir, 'docs', 'setup.md'), '# Setup Guide\nContent')

      const mockApp = createMockApp({
        manualSections: {
          'getting-started': { title: 'Getting started', pages: [] },
          'other-guides': { default: true }
        }
      })

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: docsSrcDir,
        includes: {},
        manualPages: {
          'setup.md': 'getting-started'
        }
      }]

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, configs, outputDir, {})

      const sidebar = await fs.readFile(path.join(outputDir, 'manual', '_sidebar.md'), 'utf8')
      assert.ok(sidebar.includes('Getting started'))
      assert.ok(sidebar.includes('setup.md'))

      await fs.rm(docsSrcDir, { recursive: true, force: true })
    })

    it('should replace OPTIONS placeholder in adapt.js with docsify config', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        manualSections: {
          guides: {},
          'other-guides': { default: true }
        }
      })

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, [], outputDir, {
        manualCover: '/some/path/cover.md',
        manualIndex: '/some/path/index.md'
      })

      const adaptJs = await fs.readFile(path.join(outputDir, 'manual', 'js', 'adapt.js'), 'utf8')
      // The OPTIONS placeholder in window.$docsify = OPTIONS should be replaced
      // Note: the /* global OPTIONS */ comment will still contain 'OPTIONS'
      assert.ok(!adaptJs.includes('window.$docsify = OPTIONS'))
      assert.ok(adaptJs.includes('themeColor'))
      assert.ok(adaptJs.includes('cover.md'))
      assert.ok(adaptJs.includes('index.md'))

      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('should set coverpage to false when no manualCover provided', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        manualSections: { 'other-guides': { default: true } }
      })

      const { default: docsify } = await import('../docsify/docsify.js')
      await docsify(mockApp, [], outputDir, {})

      const adaptJs = await fs.readFile(path.join(outputDir, 'manual', 'js', 'adapt.js'), 'utf8')
      assert.ok(adaptJs.includes('"coverpage":false'))
    })
  })

  describe('bugs', () => {
    it('TODO: defaultSection reduce with single entry returns array tuple instead of string', async () => {
      // BUG: In docsify.js line 26, Object.entries(sectionsConf).reduce((m, [id, data]) => ...)
      // has no initial value. When there is only one section entry, reduce() returns
      // the entry itself (an [id, data] array) without calling the callback.
      // This causes generateSectionTitle to fail with:
      //   TypeError: sectionName.slice(...).replaceAll is not a function
      // because sectionName is an array, not a string.
      //
      // To fix: add an initial value to reduce, e.g.:
      //   Object.entries(sectionsConf).reduce((m, [id, data]) => data.default ? id : m, undefined)
      // or use Array.find instead:
      //   Object.entries(sectionsConf).find(([, data]) => data.default)?.[0]
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-test-'))
      const outputDir = tmpDir
      const docsSrcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsify-src-'))

      await fs.mkdirp(path.join(docsSrcDir, 'docs'))
      await fs.writeFile(path.join(docsSrcDir, 'docs', 'test.md'), '# Test\nContent')

      const mockApp = createMockApp({
        manualSections: {
          'only-section': { default: true }
        }
      })

      const configs = [{
        enable: true,
        name: 'test-module',
        rootDir: docsSrcDir,
        includes: {}
      }]

      const { default: docsify } = await import('../docsify/docsify.js')
      // This should work but fails due to the bug described above
      await assert.rejects(
        () => docsify(mockApp, configs, outputDir, {}),
        TypeError
      )

      await fs.rm(docsSrcDir, { recursive: true, force: true })
    })
  })
})

function createMockApp (options = {}) {
  const { manualSections = {} } = options
  return {
    pkg: { version: '1.0.0' },
    config: {
      get: mock.fn((key) => {
        if (key === 'adapt-authoring-docs.manualSections') return { ...manualSections }
        return undefined
      })
    }
  }
}
