function main(global, request) {
  var dict = {}

  var setCache = function(key, newVal) {
    var oldVal = dict[key] || {}
    dict[key] = Object.assign({}, oldVal, newVal)
  }

  var notify = function(key, value) {
    var info = dict[key]

    var queue = []

    if (info.status == 'success') {
      queue = info.resolves
    } else if (info.status == 'fail') {
      queue = info.rejects
    }

    while (queue.length) {
      var fn = queue.shift()

      fn.call(null, value)
    }

    setCache(key, {
      resolves: [],
      rejects: []
    })
  }

  var handleRequest = function(url, key) {
    setCache(key, {
      status: 'pending',
      resolves: [],
      rejects: []
    })

    var ret = request(url)

    return ret
      .then(function(res) {
        setCache(key, {
          status: 'success',
          response: res
        })

        notify(key, res)

        return Promise.resolve(res)
      })
      .catch(function() {
        setCache(key, {
          status: 'fail'
        })

        notify(key, err)

        return Promise.reject(err)
      })
  }

  var cacheRequest = function(target, options = {}) {
    var key = options.key || target

    var info = dict[key]

    if (!info) {
      return handleRequest(target, key)
    }

    var status = info.status
    if (status == 'success') {
      return Promise.resolve(info.response)
    }

    if (status == 'pending') {
      return new Promise(function(resolve, reject) {
        info.resolves.push(resolve)
        info.rejects.push(reject)
      })
    }

    return handleRequest(target, key)
  }

  global.cacheRequest = cacheRequest
}

module.exports = main
