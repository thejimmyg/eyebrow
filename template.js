const mustache = require('mustache')
const fs = require('fs')
const glob = require('glob')
const path = require('path')


async function find(dir, pattern) {
  return new Promise((resolve, reject) => {
    glob(path.join(dir, pattern), {strict: true}, function (err, files) {
      // Don't seem to be able to trigger this, even in strict mode
      // if (err) {
      //   return reject(err)
      // }
      resolve(files)
    })
  })
}

async function read(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, {encoding: 'utf8'}, (err, contents) => {
      if (err) {
        return reject(err)
      }
      resolve(contents)
    })
  })
}

class Template {
  constructor() {
    this.partials = {}
  }

  async loadPartials(partialsDir) {
    const files = await find(partialsDir, '**/*.mustache')
    const prefixLength = partialsDir.length + 1
    const suffixLength = '.mustache'.length
    for (let i=0; i<files.length; i++) {
      const keepLength = files[i].length - prefixLength - suffixLength
      const name = files[i].substr(prefixLength, keepLength)
      this.partials[name] = await read(files[i])
    }
  }

  async render(path, view) {
    // XXX Currently doesn't error if no such file exists
    return mustache.render(await read(path), view, this.partials)
  }
}

module.exports = Template
