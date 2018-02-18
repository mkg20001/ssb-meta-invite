'use strict'

const INVITE_REGEX = /((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,}):\d+:@[A-Z0-9+=\/.~]+/mi

const request = require('request')
// const URL = require('url')

const {parallel} = require('async')

class Pub {
  constructor (url) {
    if (!url.startsWith('http')) url = 'http://' + url
    this.url = url
    this.online = null
  }
  _r (u, cb) {
    return request({
      url: this.url + u,
      timeout: 30 * 1000
    }, cb)
  }
  isOnline (cb) {
    this._r('/', (err, res, body) => {
      if (err && err.toString().indexOf('Invalid URI') !== -1) console.error(err)
      if (err) return cb(null, false)
      const b = body.toString()
      return cb(null, b.match(/ssb/i) && b.match(/pub/i)) // get sure this site is actually a pub
    })
  }
  getInvite (cb) {
    this._r('/invited', (err, res, body) => {
      if (err) return cb(err)
      const invite = body.toString().match(INVITE_REGEX)
      if (!invite) return cb(new Error('Invite page does not contain invite!'))
      cb(null, invite[0])
    })
  }
}

class Pubs {
  constructor (list, storage, options) {
    this.storage = storage
    this.options = options
    this.pub = {}
    this.pubs = list.map(url => (this.pub[url] = new Pub(url)))
    this.list = list.map(url => this.pub[url].url)
    this.storage.content.pubs = this.storage.content.pubs || {}
    this.list.forEach(url => {
      this.storage.content.pubs[url] = this.storage.content.pubs[url] || {}
      this.storage.content.pubs[url].invites = this.storage.content.pubs[url].invites || []
    })
  }
  start () {
    setInterval(() => {
      this._loop()
    }, 60 * 1000)
    this._loop()
  }
  _loop () {
    parallel(this.pubs.map(pub => cb => {
      pub.isOnline((err, res) => {
        if (err) res = false
        if (pub.online != res || typeof pub.online !== 'boolean') console.log('%s changed state to %s!', pub.url, res ? 'online' : 'offline')
        pub.online = res
        if (res) {
          if (this.storage.content.pubs[pub.url].invites.length >= this.options.cacheInvites) return cb()
          console.log('Getting invite from %s...', pub.url)
          pub.getInvite((err, invite) => {
            console.log('Got invite from %s! Success=%s', pub.url, !err)
            if (err) return cb()
            this.storage.content.pubs[pub.url].invites.push(invite)
            this.storage.saveSync()
            cb()
          })
        } else cb()
      })
    }))
  }

  getInvite () {
    const invites = Object.keys(this.storage.content.pubs).map(k => this.storage.content.pubs[k]).filter(i => i.length)
    if (!invites.length) return false
    process.nextTick(() => this.storage.saveSync())
    return invites[0].shift()
  }
}

module.exports = Pubs
