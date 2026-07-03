// server.js
// Express + WebSocket server for the Manta live demo.
// Serves the static frontend, the generated Robot Framework reports (Logs/),
// a whitelisted view of the test source files, and the /api/run endpoint
// that triggers a Robot Framework run and streams its output live.

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { runTests, registerClient, isRunning } = require('./runner');

const PORT = process.env.PORT || 44591;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const LOGS_DIR = path.join(__dirname, '..', 'Logs');
const TESTS_DIR = path.join(__dirname, '..', 'tests');

// Whitelisted source files exposed in the "Code" tab — never expose an
// arbitrary path from user input.
const SOURCE_FILES = {
  'ble_audio.robot': path.join(TESTS_DIR, 'ble_audio.robot'),
  'ble_keywords.robot': path.join(TESTS_DIR, 'resources', 'keywords', 'ble_keywords.robot'),
  'BluetoothMockLibrary.py': path.join(TESTS_DIR, 'resources', 'libraries', 'BluetoothMockLibrary.py'),
  'variables.yaml': path.join(TESTS_DIR, 'resources', 'variables', 'variables.yaml')
};

const app = express();

app.use(express.static(FRONTEND_DIR));
app.use('/logs', express.static(LOGS_DIR));

// Simple per-IP cooldown to prevent spamming the public Run button.
const RATE_LIMIT_MS = 30 * 1000;
const lastRunByIp = new Map();

app.post('/api/run', (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const lastRun = lastRunByIp.get(ip) || 0;

  if (now - lastRun < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRun)) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSeconds}s before running again.` });
  }

  if (isRunning()) {
    return res.status(409).json({ error: 'A test run is already in progress. Watch the live log.' });
  }

  lastRunByIp.set(ip, now);
  const result = runTests();
  res.json(result);
});

app.get('/api/source/:filename', (req, res) => {
  const filePath = SOURCE_FILES[req.params.filename];
  if (!filePath) {
    return res.status(404).json({ error: 'Unknown file.' });
  }
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read file.' });
    }
    res.type('text/plain').send(content);
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  registerClient(ws);
});

server.listen(PORT, () => {
  console.log(`Manta server listening on port ${PORT}`);
});
