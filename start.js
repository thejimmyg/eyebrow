const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const spdy = require('spdy')
const cors = require('cors')

const command = require('./command')
const markdownRender = require('./markdown')
const parse = require('./parse')
const templateRender = require('./template')

const {key, cert, port, httpsPort, theme, template, content, gzip} = command(process.argv)
const contentDir = content

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
app.use(express.static(theme, {index: false}))
if (gzip) {
  app.use(cors(), express.static(gzip, {setHeaders, index: false}))
}
app.get('*', async (req, res, next) => {
  console.log(req.url)
  const contentPath = req.url.substring(1, req.url.length)
  console.log(path.join(contentDir, contentPath))
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
  const html = await templateRender(path.join(template, type + '.mustache'), view)
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
