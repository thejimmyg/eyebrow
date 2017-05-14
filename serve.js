const express = require('express')
const fs = require('fs')
const http = require('http')
const path = require('path')
const spdy = require('spdy')

const command = require('./command')
const markdownRender = require('./markdown')
const parse = require('./parse')
const template = require('./template')

const {key, cert, port, httpsPort} = command(process.argv)

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

const app = express()
app.disable('x-powered-by')
app.all('*', redirectorHandler)
app.get('/', (req, res) => {
  fs.readFile(path.join(__dirname, 'test/simple.page'), {encoding: 'utf8'}, (err, page) => {
    if (err) {
      return res.error('Internal server error')
    }
    const {title, heading, markdown} = parse(page)
    const view = {
      title,
      heading,
      content: () => {
        return markdownRender(markdown)
      }
    }
    const html = template(`<html>
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <style>{{css}}</style>
</head>
<body>
{{{content}}}
</body>
</html>`, view)
    res
    .status(200)
    .send(html)
  })
})

const options = {key, cert}

spdy
.createServer(options, app)
.listen(httpsPort, (error) => {
  if (error) {
    console.error(error)
    return process.exit(1)
  } else {
    console.log(`Listening for HTTPS and HTTP 2 requests on port: ${httpsPort}`)
  }
})

http.createServer(app).listen(port, (error) => {
  if (error) {
    console.error(error)
    return process.exit(1)
  } else {
    console.log(`Listening for HTTP requests on port: ${port}`)
  }
})
