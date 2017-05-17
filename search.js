const searchIndex = require('search-index')
const Readable = require('stream').Readable

module.exports = {
  searchIndex
}

const docStream = function (docs) {
  const s = new Readable({objectMode: true})
  // Add as many docs as you want
  for (let i = 0; i < docs.length; i++) {
    s.push(docs[i])
  }
  // end the stream
  s.push(null)
  // s is now ready to be piped
  return s
}

const open = function (indexPath) {
  return new Promise((resolve, reject) => {
    module.exports.searchIndex({indexPath}, function (err, index) {
      if (err) {
        return reject(err)
      }
      resolve(new SearchDb(index))
    })
  })
}

class SearchDb {
  constructor (index) {
    this._index = index
  }

  async index (docs) {
    const index = this._index
    return new Promise((resolve, reject) => {
      docStream(docs)
      .pipe(index.defaultPipeline())
      .pipe(index.add())
      .on('data', function (d) {
        // this function needs to be called if you want to listen for the end event
      })
      .on('end', function () {
        resolve()
      })
      // .on('error', function (err) {
      //   return reject(err)
      // })
    })
  }

  async search (q) {
    const index = this._index
    return new Promise((resolve, reject) => {
      let matches = []
      const emitter = index.search(q)
      emitter.on('data', (doc) => {
        matches.push(doc)
      })
      emitter.on('end', () => {
        resolve(matches)
      })
    })
  }

  async close () {
    const index = this._index
    this._index = 'index closed'
    return new Promise((resolve, reject) => {
      index.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports.open = open
