const parse = require('./parse')
const path = require('path')
const markdown = require('./markdown')
const Template = require('./template')
const command = require('./command')
const search = require('./search')
const run = require('./run')

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
  it('correctly parses test/content/index', async () => {
    const result = await parse(path.join(__dirname, 'test', 'content', 'index'), ['content'])
    expect(Object.keys(result).sort()).to.deep.equal(['type', 'title', 'heading', 'content', 'root'].sort())
    const {type, title, heading, content} = result
    expect(title).to.equal(`Tove`)
    expect(type).to.equal(`page`)
    expect(heading).to.equal(`Hello`)
    log(content)
    expect(content.length).to.equal(1)
    expect(content[0].length).to.equal(2)
    expect(content[0][0]).to.equal('markdown')
    expect(content[0][1].text()).to.equal(EXPECTED_MARKDOWN)
  })

  it('correctly converts markdown to HTML', () => {
    const result = markdown(EXPECTED_MARKDOWN)
    expect(result).to.equal('<h2>Heading</h2>\n<p>Hello world! How <em>are</em> you today.</p>\n<p>Here are some tricky characters: &lt;&gt;&amp;;\'&quot;汉漢!?[]/.,</p>\n')
  })

  it('cannot render a template that does not exist', async () => {
    let caught = false
    const template = new Template()
    try {
      await template.render(path.join(__dirname, 'test', 'template', 'doesnotexist.mustache'))
    } catch (e) {
      caught = true
      expect(e.message).to.equal(`ENOENT: no such file or directory, open '${__dirname}/test/template/doesnotexist.mustache'`)
    }
    expect(caught).to.be.true()
  })

  // it('cannot load a partials dir that does not exist', async () => {
  //   let caught = false
  //   const template = new Template()
  //   try {
  //     await template.loadPartials(123)
  //   } catch (e) {
  //     caught = true
  //     expect(e.message).to.equal(`Path must be a string. Received 123`)
  //   }
  //   expect(caught).to.be.true()
  // })

  it('correctly renders the main template', async () => {
    const view = {
      title: 'Title',
      heading: 'Heading',
      content: () => {
        return markdown(EXPECTED_MARKDOWN)
      }
    }
    const template = new Template()
    await template.loadPartials(path.join(__dirname, 'test', 'template', 'partials'))
    const output = await template.render(path.join(__dirname, 'test', 'template', 'page.mustache'), view)
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
      contentDir: path.join(__dirname, 'content'),
      templateDir: path.join(__dirname, 'template'),
      themeDir: path.join(__dirname, 'theme')
    })
    expect(command([
      'node', 'eyebrow',
      '--cert', 'test/config/certificate.pem',
      '--key', 'test/config/private.key',
      '--port', '8080',
      '--https-port', '8443',
      '--content', 'test/config/content',
      '--template', 'test/config/template',
      '--theme', 'test/config/theme',
    ])).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: '8080',
      httpsPort: '8443',
      contentDir: 'test/config/content',
      templateDir: 'test/config/template',
      themeDir: 'test/config/theme'
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
        program.option('--extra-info [dir]', `Extra information`)
      },
      processResult (program, result) {
        // Mutate the result object as you wish
        result.extraInfo = program.extraInfo
      }
    }
    expect(command(['node', 'eyebrow'], options)).to.deep.equal({
      key: PRIVATE_KEY_DEFAULT,
      cert: CERTIFICATE_DEFAULT,
      port: 80,
      httpsPort: 443,
      contentDir: path.join(__dirname, 'content'),
      templateDir: path.join(__dirname, 'template'),
      themeDir: path.join(__dirname, 'theme'),
      extraInfo: undefined
    })
    expect(command([
      'node', 'eyebrow',
      '--cert', 'test/config/certificate.pem',
      '--key', 'test/config/private.key',
      '--port', '8080',
      '--https-port', '8443',
      '--content', 'test/config/content',
      '--template', 'test/config/template',
      '--theme', 'test/config/theme',
      '--extra-info', 'extra info'
    ], options)).to.deep.equal({
      key: PRIVATE_KEY_TEST,
      cert: CERTIFICATE_TEST,
      port: '8080',
      httpsPort: '8443',
      contentDir: 'test/config/content',
      templateDir: 'test/config/template',
      themeDir: 'test/config/theme',
      extraInfo: 'extra info'
    })
  })

  it('handles an error opening a search index', async () => {
    const error = new Error('Test Error')
    const searchIndex = sandbox.stub(search, 'searchIndex').callsFake((opts, cb) => {
      cb(error)
    })
    let caught = false
    try {
      await search.open(path.join(__dirname, 'test', 'search'))
    } catch (e) {
      caught = true
      expect(e).to.equal(error)
      expect(searchIndex.callCount).to.equal(1)
    }
    expect(caught).to.be.true()
  })

  it('handles an error closing a search index', async () => {
    const searchDb = await search.open(path.join(__dirname, 'test', 'search'))
    const error = new Error('Test Error')
    const origIndex = searchDb._index
    const close = sandbox.stub(searchDb._index, 'close').callsFake((cb) => {
      cb(error)
    })
    let caught = false
    try {
      await searchDb.close()
    } catch (e) {
      expect(e).to.equal(error)
      caught = true
      expect(close.callCount).to.equal(1)
    }
    expect(caught).to.be.true()
    sandbox.restore()
    await new Promise((resolve, reject) => {
      origIndex.close((err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  })

  it('builds a search index', async () => {
    const searchDb = await search.open(path.join(__dirname, 'test', 'search'))
    log(searchDb)
    await searchDb.index([{
      id: '3',
      body: 'this doc has a great body'
    }])
    const successMatches = await searchDb.search({
      query: {
        AND: {'*': ['body']}
      }
    })
    expect(successMatches.length).to.equal(1)
    expect(parseInt(successMatches[0].id)).to.equal(3)
    const failureMatches = await searchDb.search({
      query: {
        AND: {'*': ['james']}
      }
    })
    expect(failureMatches.length).to.equal(0)
    await searchDb.close()
    expect(searchDb._index).to.equal('index closed')
  })

  it('runs a command', async () => {
    const [code, out] = await run(['cat'], `hi`)
    expect(code).to.equal(0)
    expect(out).to.equal(`hi`)
  })
})
