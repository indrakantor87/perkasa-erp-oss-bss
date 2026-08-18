const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '127.0.0.1';
const TIMEOUT_MS = 8000;

function fail(reason) {
  process.stderr.write('[HEALTHCHECK FAIL] ' + reason + '\n');
  process.exit(1);
}

function succeed() {
  process.stdout.write('[HEALTHCHECK OK] server is reachable\n');
  process.exit(0);
}

const criticalFiles = ['server.js', '.next/static'];
for (const f of criticalFiles) {
  try {
    if (!fs.existsSync(path.join(__dirname, f))) {
      fail('Missing critical file/folder: ' + f);
    }
  } catch (e) {
    fail('Cannot access: ' + f + ' - ' + e.message);
  }
}

const req = http.request({
  host: HOST,
  port: PORT,
  path: '/api/health',
  method: 'GET',
  timeout: TIMEOUT_MS,
  headers: { 'User-Agent': 'Coolify-Healthcheck/1.0' }
}, (res) => {
  if (res.statusCode >= 200 && res.statusCode < 500) {
    succeed();
  } else {
    const fallbackReq = http.request({
      host: HOST,
      port: PORT,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT_MS
    }, (res2) => {
      if (res2.statusCode >= 200 && res2.statusCode < 500) succeed();
      else fail('Fallback / returned status ' + res2.statusCode);
    }).on('error', () => fail('HTTP fallback error'))
      .on('timeout', () => { fallbackReq.destroy(); fail('HTTP fallback timeout'); });
    fallbackReq.end();
  }
});

req.on('error', (err) => {
  const directReq = http.request({
    host: HOST,
    port: PORT,
    path: '/',
    method: 'GET',
    timeout: TIMEOUT_MS
  }, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 500) succeed();
    else fail('Status code after retry: ' + res.statusCode);
  }).on('error', (e2) => fail('HTTP unreachable after retry: ' + e2.message))
    .on('timeout', () => { directReq.destroy(); fail('HTTP timeout after retry'); });
  directReq.end();
});

req.on('timeout', () => { req.destroy(); fail('Primary request timeout'); });
req.end();
