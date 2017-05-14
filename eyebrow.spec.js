const fs = require('fs')
const path = require('path')
const parse = require('./parse')
const markdown = require('./markdown')
const template = require('./template')
const command = require('./command')

var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect
chai.use(dirtyChai)
const sinon = require('sinon')

const logMessages = []
const log = (...args) => { logMessages.push(args) }
// const logError = log

describe('parse', () => {
  let sandbox

  beforeEach(function () {
    // See https://blog.risingstack.com/getting-node-js-testing-and-tdd-right-node-js-at-scale/
    sandbox = sinon.sandbox.create()
  })

  afterEach(function () {  // Has to be a function to access this.currentTest
    sandbox.restore()
    if (this.currentTest.state === 'failed') {
      // Print the log messages
      for (let i = 0; i < logMessages.length; i++) {
        console.log(...logMessages[i])
      }
    } else {
      // Clear the log messages
      for (let i = 0; i < logMessages.length; i++) {
        logMessages.shift()
      }
    }
  })

  const EXPECTED_MARKDOWN = '\nHello world! How *are* you today.\n\nHere are some tricky characters: <>&;\'"汉漢!?[]/.,\n'
  it('correctly parses test/simple.page', (done) => {
    fs.readFile(path.join(__dirname, 'test/simple.page'), {encoding: 'utf8'}, (err, page) => {
      expect(err).to.be.null('Got an error opening file')
      log(page)
      const {title, heading, markdown} = parse(page)
      expect(title).to.equal(`Tove`)
      expect(heading).to.equal(`Hello`)
      expect(markdown).to.equal(EXPECTED_MARKDOWN)
      done()
    })
  })

  it('correctly converts markdown to HTML', () => {
    const result = markdown(EXPECTED_MARKDOWN)
    expect(result).to.equal('<p>Hello world! How <em>are</em> you today.</p>\n<p>Here are some tricky characters: &lt;&gt;&amp;;\'&quot;汉漢!?[]/.,</p>\n')
  })

  it('correctly renders a template', () => {
    const view = {
      title: 'Title',
      heading: 'Heading',
      content: () => {
        return markdown(EXPECTED_MARKDOWN)
      }
    }
    const output = template(`<html>
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <style>{{css}}</style>
</head>
<body>
{{{content}}}
</body>
</html>`, view)
    expect(output).to.equal(`<html>
<head>
  <meta charset="utf-8">
  <title>Title</title>
  <style></style>
</head>
<body>
<p>Hello world! How <em>are</em> you today.</p>
<p>Here are some tricky characters: &lt;&gt;&amp;;'&quot;汉漢!?[]/.,</p>

</body>
</html>`)
  })

  const PRIVATE_KEY_TEST = `-----BEGIN PRIVATE KEY-----
... Test file only ...
-----END PRIVATE KEY-----
`
  const CERTIFICATE_TEST = `-----BEGIN CERTIFICATE-----
... Test file only ...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
... Test file only ...
-----END CERTIFICATE-----
`

  it('parses command line arguments correctly', () => {
    expect(command(['node', 'eyebrow'])).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: 80,
      httpsPort: 443
    })
    expect(command([
      'node', 'eyebrow',
      '-c', 'certificate.pem',
      '-k', 'private.key',
      '-p', '8080',
      '-s', '8443'
    ])).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: '8080',
      httpsPort: '8443'
    })
    // This calls exit, so we can't test
    // expect(command(['node', 'eyebrow', '-h'])).to.deep.equal({
    //   key: PRIVATE_KEY_TEST,
    //   cert: CERTIFICATE_TEST,
    //   port: 80,
    //   httpsPort: 443
    // })
  })
})
