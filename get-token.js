const fs = require('fs');
const path = require('path');

// Token is stored in ~/.hermes/cabinet_daemon_token or similar
// Let's check the daemon auth file
const tokenPath = require('os').homedir() + '/.hermes/.cabinet_daemon_token';
if (fs.existsSync(tokenPath)) {
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  console.log('Token found:', token.substring(0, 20) + '...');
  module.exports = token;
} else {
  console.log('Token file not found at:', tokenPath);
}
