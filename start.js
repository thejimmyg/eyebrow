const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const spdy = require('spdy')
const cors = require('cors')

const command = require('./command')
const markdownRender = require('./markdown')
const parse = require('./parse')
const template = require('./template')

const commandOptions = {
  addExtraOptions (program) {
    program.option('-g, --gzip [dir]', `Directory of gzipped assets to be served with CORS support an extra Content-Encoding: gzip header`)
    program.option('-z, --gzip-cors [dir]', `Directory of gzipped assets to be served with CORS support an extra Content-Encoding: gzip header`)
    program.option('-o, --cors [dir]', `Directory of to be served with CORS support`)
  },
  processResult (program, result) {
    // Mutate the result object as you wish
    result.gzipDir = program.gzip
    result.gzipCorsDir = program.gzipCors
    result.corsDir = program.cors
  }
}
const {key, cert, port, httpsPort, themeDir, templateDir, contentDir, gzipDir, corsDir, gzipCorsDir} = command(process.argv, commandOptions)

const redirectorHandler = (req, res, next) => {
  if (req.hostname.substr(0, 4) !== 'www.' || req.protocol !== 'https') {
    let hostname = req.hostname
    if (hostname.substr(0, 4) !== 'www.') {
      hostname = `www.${hostname}`
    }
    let url = `https://${hostname}`
    if (httpsPort !== 443) {
      url += `:${httpsPort}`
    }
    url += `${req.url}`
    res.redirect(url)
  } else {
    next()
  }
}

function setHeaders (res, path, stat) {
  res.setHeader('Content-Encoding', 'gzip')
}

const app = express()
app.disable('x-powered-by')
app.all('*', redirectorHandler)
app.use(express.static(themeDir, {index: false}))
if (gzipDir) {
  app.use(express.static(gzipDir, {setHeaders, index: false}))
}
if (gzipCorsDir) {
  app.use(cors(), express.static(gzipCorsDir, {setHeaders, index: false}))
}
if (corsDir) {
  app.use(cors(), express.static(corsDir, {index: false}))
}
app.get('*', async (req, res, next) => {
  console.log(req.url)
  const contentPath = req.url.substring(1, req.url.length)
  let stat
  try {
    stat = fs.statSync(path.join(contentDir, contentPath))
  } catch (e) {
    return next()
  }
  let result
  if (stat.isDirectory()) {
    result = await parse(path.join(contentDir, contentPath, 'index'), ['content'])
  } else {
    result = await parse(path.join(contentDir, contentPath), ['content'])
  }
  const {type, title, heading, content} = result
  const view = {
    title,
    heading,
    content: () => {
      let result = ''
      for (let i = 0; i < content.length; i++) {
        const [type, value] = content[i]
        switch (type) {
          case 'markdown':
            result += markdownRender(value)
            break
          default:
            throw new Error(`Unknown block type ${type} in region 'content'`)
        }
      }
      return result
    }
  }
  const html = await template(path.join(templateDir, type + '.mustache'), view)
  res
  .status(200)
  .send(html)
})

const options = {key, cert}

try {
  spdy
  .createServer(options, app)
  .listen(httpsPort, (error) => {
    if (error) {
      console.error(error)
      return process.exit(1)
    } else {
      console.log(`Listening for HTTPS and HTTP 2 requests on port ${httpsPort}`)
    }
  })
} catch (e) {
  console.error(e)
  console.error(`Could not serve HTTPS on port ${httpsPort}`)
}

http.createServer(app).listen(port, (error) => {
  if (error) {
    console.error(error)
    return process.exit(1)
  } else {
    console.log(`Listening for HTTP requests on port ${port}`)
  }
})
