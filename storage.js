'use strict'

const fs = require('fs')

class Storage {
  constructor (file) {
    this.file = file
  }
  read (cb) {
    const {file} = this
    if (fs.existsSync(file)) {
      fs.readFile(file, (err, content) => {
        if (err) return cb(err)
        this.content = JSON.parse(content)
        cb()
      })
    } else {
      this.content = {}
      this.saveSync()
      cb()
    }
  }
  saveSync () {
    fs.writeFileSync(this.file, Buffer.from(JSON.stringify(this.content)))
  }
}

module.exports = Storage
