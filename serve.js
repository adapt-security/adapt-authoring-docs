import { App } from 'adapt-authoring-core';
import http from 'http';
import url from 'url';
import fs from 'fs/promises';
import path from 'path';

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

process.env.NODE_ENV ??= 'production';
process.env.ADAPT_AUTHORING_LOGGER__mute = true;

console.log('Starting app, please wait\n');

App.instance.onReady().then(async app => {
  const root = path.resolve(app.config.get('adapt-authoring-docs.outputDir'));
  (await fs.readdir(root)).forEach((dir, i) => new Server(path.resolve(root, dir), i));
});

class Server {
  constructor(dir, i) {
    this.root = dir;
    this.port = 9001 + i;
    http.createServer(this.requestHandler.bind(this)).listen(this.port);
    console.log(`${path.basename(dir)} docs hosted at http://localhost:${this.port}`);
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
}