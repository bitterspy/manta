// runner.js
// Handles spawning the Robot Framework process for a chosen suite,
// broadcasting its output to connected WebSocket clients, and enforcing
// the single-run lock + timeout.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SUITE_DIR = path.join(__dirname, '..', 'robotframeworktests', 'tests');
const LOGS_DIR = path.join(__dirname, '..', 'Logs');
const LISTENER_FILE = path.join(__dirname, '..', 'robotframeworktests', 'libraries', 'LiveConsoleListener.py');
const PROCESS_TIMEOUT_MS = 90 * 1000;

// Whitelisted suites that can be triggered from the public "Run" buttons —
// never build a path from unchecked user input.
const SUITES = {
  'ble_audio': {
    label: 'BLE Audio Connectivity',
    file: path.join(SUITE_DIR, 'ble_audio.robot')
  },
  'connectivity_negative': {
    label: 'Connectivity Negative Paths',
    file: path.join(SUITE_DIR, 'connectivity_negative.robot')
  },
  'performance_regression': {
    label: 'Performance & Regression',
    file: path.join(SUITE_DIR, 'performance_regression.robot')
  }
};

// Robot Framework is installed in a project-local virtualenv (created with
// `python3 -m venv venv`) rather than system-wide, since the server's
// Python install is externally managed (PEP 668). Fall back to the plain
// "robot" command for local development where a venv may not be used.
const ROBOT_BIN = (() => {
  const venvRobot = path.join(__dirname, '..', 'venv', 'bin', 'robot');
  return fs.existsSync(venvRobot) ? venvRobot : 'robot';
})();

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

function listSuites() {
  return Object.entries(SUITES).map(([id, suite]) => ({ id, label: suite.label }));
}

function runSuite(suiteId) {
  if (isRunning) {
    return { started: false, reason: 'A test run is already in progress.' };
  }

  const suite = SUITES[suiteId];
  if (!suite) {
    return { started: false, reason: 'Unknown test suite.' };
  }

  isRunning = true;
  broadcast({ type: 'start', suiteId, label: suite.label, fileName: path.basename(suite.file) });

  // Robot Framework's own --console verbose only prints a summary per test
  // case, not per keyword. LiveConsoleListener hooks into the real
  // start_keyword/end_keyword execution events and prints each one as it
  // happens, which is what actually drives the live, step-by-step feel of
  // the demo. --loglevel DEBUG raises the detail captured in log.html too.
  const child = spawn(
    ROBOT_BIN,
    [
      '--outputdir', LOGS_DIR,
      '--output', `output-${suiteId}.xml`,
      '--log', `log-${suiteId}.html`,
      '--report', `report-${suiteId}.html`,
      '--listener', LISTENER_FILE,
      '--console', 'verbose',
      '--loglevel', 'DEBUG',
      suite.file
    ],
    { cwd: SUITE_DIR }
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
      suiteId,
      exitCode: code,
      reportUrl: `/logs/report-${suiteId}.html`,
      logUrl: `/logs/log-${suiteId}.html`
    });
  });

  child.on('error', (err) => {
    clearTimeout(timeout);
    isRunning = false;
    broadcast({ type: 'line', text: `\n[Manta] Failed to start Robot Framework: ${err.message}\n` });
    broadcast({ type: 'done', suiteId, exitCode: -1, reportUrl: null, logUrl: null });
  });

  return { started: true };
}

module.exports = { runSuite, listSuites, registerClient, isRunning: () => isRunning };
