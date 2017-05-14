const Command = require('commander').Command
const path = require('path')
const fs = require('fs')

module.exports = (args) => {
  const program = new Command()
  program
  .version('0.1.0')
  .option('-k, --key [path]', 'Path to the HTTPS private key, defaults to private.key in the current directory')
  .option('-c, --cert [path]', 'Path to the HTTPS certificate, defaults to certificate.pem in the current directory')
  .option('-p, --port [port]', 'Port for HTTP, defaults to 80')
  .option('-s, --https-port [port]', 'Port for HTTPS, defaults to 443')
  .parse(args)

  const key = fs.readFileSync(program.key || path.join(__dirname, 'private.key'), {encoding: 'utf8'})
  const cert = fs.readFileSync(program.cert || path.join(__dirname, 'certificate.pem'), {encoding: 'utf8'})
  const port = program.port || 80
  const httpsPort = program.httpsPort || 443

  return {key, cert, port, httpsPort}
}
