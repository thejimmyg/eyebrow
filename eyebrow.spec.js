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
      await parse(path.join(__dirname, 'test', 'content', 'doesnotexist'), ['content'])
    } catch (e) {
      caught = true
      expect(e.message).to.equal(`ENOENT: no such file or directory, open '${__dirname}/test/content/doesnotexist'`)
    }
    expect(caught).to.be.true()
  })

  it('disallows type, title and heading as page regions', async () => {
    const disallowed = ['type', 'title', 'heading']
    for (let i = 0; i < disallowed.length; i++) {
      let caught = false
      const reserved = disallowed[i]
      try {
        await parse(path.join(__dirname, 'test', 'content', 'index'), [reserved])
      } catch (e) {
        caught = true
        expect(e.message).to.equal(`'${reserved}' is reserved and cannot be used as a region name`)
      }
      expect(caught).to.be.true()
    }
  })

  const EXPECTED_MARKDOWN = '\n# Heading\n\nHello world! How *are* you today.\n\nHere are some tricky characters: <>&;\'"汉漢!?[]/.,\n'
  it('correctly parses test/index', async () => {
    const result = await parse(path.join(__dirname, 'test', 'content', 'index'), ['content'])
    expect(Object.keys(result).sort()).to.deep.equal(['type', 'title', 'heading', 'content'].sort())
    const {type, title, heading, content} = result
    expect(title).to.equal(`Tove`)
    expect(type).to.equal(`page`)
    expect(heading).to.equal(`Hello`)
    expect(content).to.deep.equal([['markdown', EXPECTED_MARKDOWN]])
  })

  it('correctly converts markdown to HTML', () => {
    const result = markdown(EXPECTED_MARKDOWN)
    expect(result).to.equal('<h2>Heading</h2>\n<p>Hello world! How <em>are</em> you today.</p>\n<p>Here are some tricky characters: &lt;&gt;&amp;;\'&quot;汉漢!?[]/.,</p>\n')
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
    const output = await template(path.join(__dirname, 'test', 'template', 'page.mustache'), view)
    log(output)
    expect(output).to.equal(`<!DOCTYPE HTML PUBLIC>
<html>
<head>
  <meta charset="utf-8">
  <title>Title</title>
  <style></style>
</head>
<body>
<h2>Heading</h2>
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
      httpsPort: 443,
      content: path.join(__dirname, 'content'),
      template: path.join(__dirname, 'template'),
      theme: path.join(__dirname, 'theme')
    })
    expect(command([
      'node', 'eyebrow',
      '-r', 'test/config/certificate.pem',
      '-k', 'test/config/private.key',
      '-p', '8080',
      '-s', '8443',
      '-c', 'test/config/content',
      '-t', 'test/config/template',
      '-e', 'test/config/theme'
    ])).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: '8080',
      httpsPort: '8443',
      content: 'test/config/content',
      template: 'test/config/template',
      theme: 'test/config/theme'
    })
    // Note: It is possible to set the theme and template directories to the same place if you like.

    // This calls exit, so we can't test
    // expect(command(['node', 'eyebrow', '-h'])).to.deep.equal({
    //   key: PRIVATE_KEY_TEST,
    //   cert: CERTIFICATE_TEST,
    //   port: 80,
    //   httpsPort: 443
    // })
  })
  it('parses command line arguments correctly with extra options and processed result', () => {
    const options = {
      addExtraOptions (program) {
        program.option('-g, --gzip [dir]', `Directory of gzipped assets to be served with CORS support an extra Content-Encoding: gzip header`)
      },
      processResult (program, result) {
        // Mutate the result object as you wish
        result.gzip = program.gzip
      }
    }
    expect(command(['node', 'eyebrow'], options)).to.deep.equal({
      key: PRIVATE_KEY_DEFAULT,
      cert: CERTIFICATE_DEFAULT,
      port: 80,
      httpsPort: 443,
      content: path.join(__dirname, 'content'),
      template: path.join(__dirname, 'template'),
      theme: path.join(__dirname, 'theme'),
      gzip: undefined
    })
    expect(command([
      'node', 'eyebrow',
      '-r', 'test/config/certificate.pem',
      '-k', 'test/config/private.key',
      '-p', '8080',
      '-s', '8443',
      '-c', 'test/config/content',
      '-t', 'test/config/template',
      '-e', 'test/config/theme',
      '-g', 'test/config/gzip'
    ], options)).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: '8080',
      httpsPort: '8443',
      content: 'test/config/content',
      template: 'test/config/template',
      theme: 'test/config/theme',
      gzip: 'test/config/gzip'
    })
  })
})
