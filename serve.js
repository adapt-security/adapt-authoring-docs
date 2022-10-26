#!/usr/bin/env node
import { App } from 'adapt-authoring-core';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import url from 'url';

function getMime(filePath) {
  const ext = path.parse(filePath).ext;
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
  }[ext] || 'text/plain';
}
let open;
const args = process.argv.slice(2).filter(a => {
  if(a === '--open') open = true;
  return a !== '--open';
});

process.env.NODE_ENV ??= 'production';
process.env.ADAPT_AUTHORING_LOGGER__mute = true;

console.log('Starting app, please wait\n');

App.instance.onReady().then(async app => {
  console.log('App started\n');
  const root = path.resolve(app.config.get('adapt-authoring-docs.outputDir'));
  (await fs.readdir(root)).forEach((dir, i) => {
    if(!args.length || args.includes(dir)) {
      const s = new Server(path.resolve(root, dir), i);
      if(open) s.openBrowser();
    }
  });
  if(dirArg) {
  }
});

class Server {
  constructor(dir, i) {
    this.root = dir;
    this.port = 9001 + i;
    this.url = `http://localhost:${this.port}`;
    http.createServer(this.requestHandler.bind(this)).listen(this.port);
    console.log(`${path.basename(dir)} docs hosted at ${this.url}`);
  }
  async requestHandler(req, res) {
    const file = url.parse(req.url).pathname.slice(1);
    const filePath = path.resolve(this.root, file ? file : `index.html`);
    try {
      await fs.stat(filePath);
    } catch(e) {
      res.statusCode = 404;
      res.end(`Not found: ${filePath}`);
      return;
    }
    try {
      res.setHeader('Content-type', getMime(filePath));
      res.end(await fs.readFile(filePath));
    } catch(e) {
      res.statusCode = 500;
      res.end(`Error getting the file: ${e}`);
    }
  }
  openBrowser() {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(`${command} http://localhost:${this.port}`, { shell: true })
      .on('error', e => console.log('spawn error', e));
  }
}