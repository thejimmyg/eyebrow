const libxml = require('libxmljs')
const fs = require('fs')

module.exports = async function (path, regions) {
  return new Promise((resolve, reject) => {
    const result = {}
    for (let r = 0; r < regions.length; r++) {
      const regionName = regions[r]
      if (regionName === 'type' || regionName === 'title' || regionName === 'heading') {
        throw new Error(`'${regionName}' is reserved and cannot be used as a region name`)
      }
      result[regionName] = []
    }
    fs.readFile(path, {encoding: 'utf8'}, (err, page) => {
      if (err) {
        return reject(err)
      }
      const xmlDoc = libxml.parseXmlString(page)
      const root = xmlDoc.root()
      const children = root.childNodes()
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const regionName = child.name()
        switch (regionName) {
          case 'title':
            result.title = child.text()
            break
          case 'heading':
            result.heading = child.text()
            break
          default:
            if (regions.indexOf(regionName) !== -1) {
              const blocks = child.childNodes()
              for (let j = 0; j < blocks.length; j++) {
                const block = blocks[j]
                if (block.name() !== 'text') {
                  result[regionName].push([block.name(), block])
                }
              }
            }
        }
      }
      result.type = root.name()
      resolve(result)
    })
  })
}
