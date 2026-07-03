// server.js
// Express + WebSocket server for the Manta live demo.
// Serves the static frontend, the generated Robot Framework reports (Logs/),
// a whitelisted view of the test source files, and the /api/run endpoint
// that triggers a Robot Framework run (for a chosen suite) and streams its
// output live.

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { runSuite, listSuites, registerClient, isRunning } = require('./runner');
const { buildKeywordIndex } = require('./keywordIndex');

const PORT = process.env.PORT || 44591;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const LOGS_DIR = path.join(__dirname, '..', 'Logs');
const RF_ROOT_DIR = path.join(__dirname, '..', 'robotframeworktests');
const RF_TESTS_DIR = path.join(RF_ROOT_DIR, 'tests');
const RF_KEYWORDS_DIR = path.join(RF_ROOT_DIR, 'keywords');
const RF_LIBRARIES_DIR = path.join(RF_ROOT_DIR, 'libraries');
const RF_VARIABLES_DIR = path.join(RF_ROOT_DIR, 'variables');

// Whitelisted source files exposed in the "Code" tab — never expose an
// arbitrary path from user input.
const SOURCE_FILES = {
  'ble_audio.robot': path.join(RF_TESTS_DIR, 'ble_audio.robot'),
  'connectivity_negative.robot': path.join(RF_TESTS_DIR, 'connectivity_negative.robot'),
  'performance_regression.robot': path.join(RF_TESTS_DIR, 'performance_regression.robot'),
  'hearing_aid_specific.robot': path.join(RF_TESTS_DIR, 'hearing_aid_specific.robot'),
  'ble_keywords.robot': path.join(RF_KEYWORDS_DIR, 'ble_keywords.robot'),
  'BluetoothMockLibrary.py': path.join(RF_LIBRARIES_DIR, 'BluetoothMockLibrary.py'),
  'variables.yaml': path.join(RF_VARIABLES_DIR, 'variables.yaml')
};

const app = express();

app.use(express.static(FRONTEND_DIR));
app.use('/logs', express.static(LOGS_DIR));

// Simple per-IP cooldown to prevent spamming the public Run buttons.
const RATE_LIMIT_MS = 20 * 1000;
const lastRunByIp = new Map();

app.get('/api/suites', (req, res) => {
  res.json(listSuites());
});

app.post('/api/run/:suiteId', (req, res) => {
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
  const result = runSuite(req.params.suiteId);
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

// Maps keyword names to their definition site (file + line), so the
// "Code" tab can offer IDE-style "go to definition" links. Rebuilt on
// every request rather than cached, since these are small local files
// and it keeps the index trivially correct after any edit/redeploy.
app.get('/api/keyword-index', (req, res) => {
  try {
    res.json(buildKeywordIndex(SOURCE_FILES));
  } catch (err) {
    res.status(500).json({ error: 'Could not build keyword index.' });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  registerClient(ws);
});

server.listen(PORT, () => {
  console.log(`Manta server listening on port ${PORT}`);
});
