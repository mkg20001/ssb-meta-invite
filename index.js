'use strict'

const config = require('./config')

const Pubs = require('./pubs')
const Store = require('./storage')

const s = new Store(config.file)
s.read(err => {
  if (err) throw err
  const pubs = new Pubs(config.pubs, s, config.options)
  pubs.start()
})
