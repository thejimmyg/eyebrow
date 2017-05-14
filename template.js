const mustache = require('mustache')
const fs = require('fs')

module.exports = async function (path, view) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, {encoding: 'utf8'}, (err, template) => {
      if (err) {
        return reject(err)
      }
      resolve(mustache.render(template, view))
    })
  })
}
