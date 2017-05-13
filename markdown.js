const commonmark = require('commonmark')

const reader = new commonmark.Parser()
const writer = new commonmark.HtmlRenderer()

module.exports = function (markdown) {
  const parsed = reader.parse(markdown)
  return writer.render(parsed)
}
