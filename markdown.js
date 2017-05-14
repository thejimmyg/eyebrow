const commonmark = require('commonmark')

const reader = new commonmark.Parser()
const writer = new commonmark.HtmlRenderer({safe: true})

module.exports = function (markdown) {
  const parsed = reader.parse(markdown)
  // Modify the tree to increase heading levels
  var walker = parsed.walker()
  var event, node
  while ((event = walker.next())) {
    node = event.node
    if (event.entering && node.type === 'heading') {
      node.level += 1
    }
  }
  return writer.render(parsed)
}
