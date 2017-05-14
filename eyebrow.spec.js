const parse = require('./parse')
const path = require('path')
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

describe('eyebrow', () => {
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

  it('cannot render a page that does not exist', async () => {
    let caught = false
    try {
      await parse(path.join(__dirname, 'test', 'www', 'doesnotexist.page'))
    } catch (e) {
      caught = true
      expect(e.message).to.equal(`ENOENT: no such file or directory, open '${__dirname}/test/www/doesnotexist.page'`)
    }
    expect(caught).to.be.true()
  })

  const EXPECTED_MARKDOWN = '\nHello world! How *are* you today.\n\nHere are some tricky characters: <>&;\'"汉漢!?[]/.,\n'
  it('correctly parses test/simple.page', async () => {
    const {title, heading, markdown} = await parse(path.join(__dirname, 'test', 'www', 'simple.page'))
    expect(title).to.equal(`Tove`)
    expect(heading).to.equal(`Hello`)
    expect(markdown).to.equal(EXPECTED_MARKDOWN)
  })

  it('correctly converts markdown to HTML', () => {
    const result = markdown(EXPECTED_MARKDOWN)
    expect(result).to.equal('<p>Hello world! How <em>are</em> you today.</p>\n<p>Here are some tricky characters: &lt;&gt;&amp;;\'&quot;汉漢!?[]/.,</p>\n')
  })

  it('cannot render a template that does not exist', async () => {
    let caught = false
    try {
      await template(path.join(__dirname, 'test', 'template', 'doesnotexist.mustache'))
    } catch (e) {
      caught = true
      expect(e.message).to.equal(`ENOENT: no such file or directory, open '${__dirname}/test/template/doesnotexist.mustache'`)
    }
    expect(caught).to.be.true()
  })

  it('correctly renders the main template', async () => {
    const view = {
      title: 'Title',
      heading: 'Heading',
      content: () => {
        return markdown(EXPECTED_MARKDOWN)
      }
    }
    const output = await template(path.join(__dirname, 'test', 'template', 'main.mustache'), view)
    log(output)
    expect(output).to.equal(`<!DOCTYPE HTML PUBLIC>
<html>
<head>
  <meta charset="utf-8">
  <title>Title</title>
  <style></style>
</head>
<body>
<p>Hello world! How <em>are</em> you today.</p>
<p>Here are some tricky characters: &lt;&gt;&amp;;'&quot;汉漢!?[]/.,</p>

</body>
</html>
`)
  })

  const PRIVATE_KEY_TEST = `-----BEGIN PRIVATE KEY-----
... Test private key ...
-----END PRIVATE KEY-----
`
  const CERTIFICATE_TEST = `-----BEGIN CERTIFICATE-----
... Test certificate ...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
... Test certificate ...
-----END CERTIFICATE-----
`
  const PRIVATE_KEY_DEFAULT = `-----BEGIN PRIVATE KEY-----
... Default private key ...
-----END PRIVATE KEY-----
`
  const CERTIFICATE_DEFAULT = `-----BEGIN CERTIFICATE-----
... Default certificate ...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
... Default certificate ...
-----END CERTIFICATE-----
`
  it('parses command line arguments correctly', () => {
    expect(command(['node', 'eyebrow'])).to.deep.equal({
      key: PRIVATE_KEY_DEFAULT,
      cert: CERTIFICATE_DEFAULT,
      port: 80,
      httpsPort: 443
    })
    expect(command([
      'node', 'eyebrow',
      '-c', 'test/config/certificate.pem',
      '-k', 'test/config/private.key',
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
  it('resolves a file to a path, choose the correct templates and renderers', () => {

  })
})
