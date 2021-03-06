const spawn = require('child_process').spawn

module.exports = function (args, stdin) {
  return new Promise((resolve, reject) => {
    const process = spawn(args[0], args.slice(1))
    process.stdin.end(stdin)
    let out = ''
    process.stdout.on('data', (data) => {
      out += data
    })
    // process.stderr.on('data', (data) => {
    //   process.stderr.write(data)
    // })
    process.on('close', (code) => {
      // if (code === 0) {
      resolve([code, out])
      // } else {
      //   reject(code)
      // }
    })
  })
}
