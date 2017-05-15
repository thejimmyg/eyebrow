const Command = require('commander').Command
const path = require('path')
const fs = require('fs')

module.exports = (args) => {
  const program = new Command()
  program
  .version('0.1.0')
  .option('-k, --key [path]', 'Path to the HTTPS private key, defaults to private.key in the current directory')
  .option('-r, --cert [path]', 'Path to the HTTPS certificate, defaults to certificate.pem in the current directory')
  .option('-p, --port [port]', 'Port for HTTP, defaults to 80')
  .option('-s, --https-port [port]', 'Port for HTTPS, defaults to 443')
  .option('-c, --content [dir]', `Directory to serve content files such as pages from, defaults to './content'`)
  .option('-t, --template [dir]', `Directory to serve mustache templates from, defaults to './template'`)
  .option('-e, --theme [dir]', `Directory to serve static files for the theme from, defaults to './theme'`)
  .option('-g, --gzip [dir]', `Directory of gzipped assets to be served with an extra Content-Encoding: gzip header`)
  .parse(args)

  const key = fs.readFileSync(program.key || path.join(__dirname, 'private.key'), {encoding: 'utf8'})
  const cert = fs.readFileSync(program.cert || path.join(__dirname, 'certificate.pem'), {encoding: 'utf8'})
  const port = program.port || 80
  const httpsPort = program.httpsPort || 443
  const theme = program.theme || path.join(__dirname, 'theme')
  const template = program.template || path.join(__dirname, 'template')
  const content = program.content || path.join(__dirname, 'content')
  const gzip = program.gzip

  return {key, cert, port, httpsPort, theme, template, content, gzip}
}
