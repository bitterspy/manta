// runner.js
// Handles spawning the Robot Framework process, broadcasting its output to
// connected WebSocket clients, and enforcing the single-run lock + timeout.

const { spawn } = require('child_process');
const path = require('path');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const LOGS_DIR = path.join(__dirname, '..', 'Logs');
const SUITE_FILE = path.join(TESTS_DIR, 'ble_audio.robot');
const PROCESS_TIMEOUT_MS = 90 * 1000;

let isRunning = false;
let clients = new Set();

function registerClient(ws) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

function runTests() {
  if (isRunning) {
    return { started: false, reason: 'A test run is already in progress.' };
  }

  isRunning = true;
  broadcast({ type: 'start' });

  const child = spawn(
    'robot',
    ['--outputdir', LOGS_DIR, SUITE_FILE],
    { cwd: TESTS_DIR }
  );

  const timeout = setTimeout(() => {
    child.kill('SIGKILL');
    broadcast({ type: 'line', text: '\n[Manta] Process timed out and was terminated.\n' });
  }, PROCESS_TIMEOUT_MS);

  child.stdout.on('data', (chunk) => {
    broadcast({ type: 'line', text: chunk.toString() });
  });

  child.stderr.on('data', (chunk) => {
    broadcast({ type: 'line', text: chunk.toString() });
  });

  child.on('close', (code) => {
    clearTimeout(timeout);
    isRunning = false;
    broadcast({
      type: 'done',
      exitCode: code,
      reportUrl: '/logs/report.html',
      logUrl: '/logs/log.html'
    });
  });

  child.on('error', (err) => {
    clearTimeout(timeout);
    isRunning = false;
    broadcast({ type: 'line', text: `\n[Manta] Failed to start Robot Framework: ${err.message}\n` });
    broadcast({ type: 'done', exitCode: -1, reportUrl: null, logUrl: null });
  });

  return { started: true };
}

module.exports = { runTests, registerClient, isRunning: () => isRunning };
