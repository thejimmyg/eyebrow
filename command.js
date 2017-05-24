const Command = require('commander').Command
const path = require('path')
const fs = require('fs')

module.exports = (args, options) => {
  const {addExtraOptions, processResult} = options || {}
  const program = new Command()
  program
  .version('0.1.0')
  .option('--key [path]', 'Path to the HTTPS private key, defaults to private.key in the current directory')
  .option('--cert [path]', 'Path to the HTTPS certificate, defaults to certificate.pem in the current directory')
  .option('--port [port]', 'Port for HTTP, defaults to 80')
  .option('--https-port [port]', 'Port for HTTPS, defaults to 443')
  .option('--content [dir]', `Directory to serve content files such as pages from, defaults to './content'`)
  .option('--template [dir]', `Directory to serve mustache templates from, defaults to './template'`)
  .option('--theme [dir]', `Directory to serve static files for the theme from, defaults to './theme'`)
  if (addExtraOptions) {
    addExtraOptions(program)
  }
  program.parse(args)

  const key = fs.readFileSync(program.key || path.join(__dirname, 'private.key'), {encoding: 'utf8'})
  const cert = fs.readFileSync(program.cert || path.join(__dirname, 'certificate.pem'), {encoding: 'utf8'})
  const port = program.port || 80
  const httpsPort = program.httpsPort || 443
  const themeDir = program.theme || path.join(__dirname, 'theme')
  const templateDir = program.template || path.join(__dirname, 'template')
  const contentDir = program.content || path.join(__dirname, 'content')
  const result = {key, cert, port, httpsPort, themeDir, templateDir, contentDir}
  if (processResult) {
    processResult(program, result)
  }
  return result
}
