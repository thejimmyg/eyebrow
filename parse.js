const libxml = require('libxmljs')
const fs = require('fs')

module.exports = async function (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, {encoding: 'utf8'}, (err, page) => {
      if (err) {
        return reject(err)
      }
      const xmlDoc = libxml.parseXmlString(page)
      const title = xmlDoc.get('//title').text()
      const heading = xmlDoc.get('//heading').text()
      const markdown = xmlDoc.get('//markdown').text()
      resolve({title, heading, markdown})
    })
  })
}
