const http = require('http');

const data = JSON.stringify({
  id: 'test-session-1',
  prompt: 'Echo test: say "Cabinet + Hermes integration working"',
  cwd: './data',
  timeoutSeconds: 30
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/sessions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
