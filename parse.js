const libxml = require('libxmljs')

module.exports = function (page) {
  const xmlDoc = libxml.parseXmlString(page)
  const title = xmlDoc.get('//title').text()
  const heading = xmlDoc.get('//heading').text()
  const markdown = xmlDoc.get('//markdown').text()
  return {title, heading, markdown}
}
