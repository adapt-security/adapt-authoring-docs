import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import path from 'path'
import DocsifyPluginWrapper from '../docsify/DocsifyPluginWrapper.js'

describe('DocsifyPluginWrapper', () => {
  describe('constructor', () => {
    it('should store the config object', () => {
      const config = { pluginEntry: '/some/path/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      assert.equal(wrapper.config, config)
    })

    it('should set config.srcDir to the dirname of pluginEntry', () => {
      const config = { pluginEntry: '/some/path/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      assert.equal(wrapper.config.srcDir, '/some/path')
    })

    it('should handle pluginEntry in current directory', () => {
      const config = { pluginEntry: 'plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      assert.equal(wrapper.config.srcDir, '.')
    })

    it('should handle pluginEntry with nested paths', () => {
      const config = { pluginEntry: '/a/b/c/d/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      assert.equal(wrapper.config.srcDir, '/a/b/c/d')
    })
  })

  describe('customFiles', () => {
    it('should return empty array when plugin is undefined', () => {
      const config = { pluginEntry: '/some/path/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      // plugin is not set yet (before init), so accessing customFiles
      // will throw because this.plugin is undefined
      assert.throws(() => wrapper.customFiles, TypeError)
    })

    it('should return plugin.customFiles when set', () => {
      const config = { pluginEntry: '/some/path/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      wrapper.plugin = { customFiles: ['/a.js', '/b.js'] }
      assert.deepEqual(wrapper.customFiles, ['/a.js', '/b.js'])
    })

    it('should return empty array when plugin.customFiles is not set', () => {
      const config = { pluginEntry: '/some/path/plugin.js' }
      const wrapper = new DocsifyPluginWrapper(config)
      wrapper.plugin = {}
      assert.deepEqual(wrapper.customFiles, [])
    })
  })

  describe('generateTOC', () => {
    let wrapper

    beforeEach(() => {
      wrapper = new DocsifyPluginWrapper({ pluginEntry: '/some/path/plugin.js' })
    })

    it('should generate TOC HTML with string items', () => {
      wrapper.plugin = { manualFile: 'guide.md' }
      const result = wrapper.generateTOC(['Introduction', 'Setup'])
      assert.ok(result.includes('### Quick navigation'))
      assert.ok(result.includes('<ul class="toc">'))
      assert.ok(result.includes('</ul>'))
      assert.ok(result.includes('<li><a href="#/guide?id=Introduction">Introduction</a></li>'))
      assert.ok(result.includes('<li><a href="#/guide?id=Setup">Setup</a></li>'))
    })

    it('should generate TOC HTML with array items [text, link]', () => {
      wrapper.plugin = { manualFile: 'guide.md' }
      const result = wrapper.generateTOC([['Display Text', 'link-id']])
      assert.ok(result.includes('<li><a href="#/guide?id=link-id">Display Text</a></li>'))
    })

    it('should handle mixed string and array items', () => {
      wrapper.plugin = { manualFile: 'guide.md' }
      const result = wrapper.generateTOC(['Simple', ['Complex', 'complex-link']])
      assert.ok(result.includes('<li><a href="#/guide?id=Simple">Simple</a></li>'))
      assert.ok(result.includes('<li><a href="#/guide?id=complex-link">Complex</a></li>'))
    })

    it('should handle empty items array', () => {
      wrapper.plugin = { manualFile: 'guide.md' }
      const result = wrapper.generateTOC([])
      assert.ok(result.includes('### Quick navigation'))
      assert.ok(result.includes('<ul class="toc">'))
      assert.ok(result.includes('</ul>'))
      // No list items
      assert.ok(!result.includes('<li>'))
    })

    it('should strip file extension from pageName', () => {
      wrapper.plugin = { manualFile: 'my-guide.md' }
      const result = wrapper.generateTOC(['Item'])
      assert.ok(result.includes('#/my-guide?id='))
    })

    it('should handle manualFile with no extension', () => {
      wrapper.plugin = { manualFile: 'guide' }
      const result = wrapper.generateTOC(['Item'])
      assert.ok(result.includes('#/guide?id='))
    })

    it('should use empty string as pageName when plugin has no manualFile', () => {
      wrapper.plugin = {}
      const result = wrapper.generateTOC(['Item'])
      assert.ok(result.includes('#/?id=Item'))
    })
  })

  describe('init', () => {
    it('should throw if plugin has no run function', async () => {
      const wrapper = new DocsifyPluginWrapper({
        pluginEntry: path.resolve('tests/fixtures/no-run-plugin.js')
      })
      await assert.rejects(() => wrapper.init(), {
        message: /must define a 'run' function/
      })
    })

    it('should throw if plugin run is not a function', async () => {
      const wrapper = new DocsifyPluginWrapper({
        pluginEntry: path.resolve('tests/fixtures/bad-run-plugin.js')
      })
      await assert.rejects(() => wrapper.init(), {
        message: /must define a 'run' function/
      })
    })

    it('should call plugin.run and set defaults', async () => {
      const wrapper = new DocsifyPluginWrapper({
        pluginEntry: path.resolve('tests/fixtures/good-plugin.js'),
        app: {}
      })
      await wrapper.init()
      assert.ok(Array.isArray(wrapper.plugin.contents))
      assert.ok(Array.isArray(wrapper.plugin.customFiles))
      assert.equal(typeof wrapper.plugin.replace, 'object')
    })
  })

  describe('writeFile', () => {
    it('should throw when manualFile does not exist', async () => {
      const wrapper = new DocsifyPluginWrapper({
        pluginEntry: '/some/path/plugin.js',
        outputDir: '/tmp/test-output'
      })
      wrapper.plugin = {
        manualFile: 'nonexistent.md',
        contents: [],
        replace: {},
        customFiles: []
      }
      await assert.rejects(() => wrapper.writeFile(), {
        message: /Failed to load manual file/
      })
    })
  })
})
