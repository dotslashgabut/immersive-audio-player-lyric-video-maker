const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static(path.join(__dirname)));

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.listen(startPort);
  });
}

findFreePort(3000).then(port => {
  app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
    fs.writeFileSync('port.txt', String(port));
  });
}).catch(err => {
  console.error('❌ Failed to find free port:', err);
  process.exit(1);
});