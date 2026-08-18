const http = require('http')
const PORT = process.env.PORT || 3000
const options = { host: '127.0.0.1', port: PORT, path: '/', method: 'GET', timeout: 5000 }
const req = http.request(options, (res) => {
  process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1)
})
req.on('error', () => process.exit(1))
req.on('timeout', () => { req.destroy(); process.exit(1) })
req.end()
