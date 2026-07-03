// app.js
// Handles tab switching, the WebSocket live log stream, per-suite Run
// buttons, and fetching source files for the Code tab.

(() => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(`tab-${button.dataset.tab}`).classList.add('active');
    });
  });

  const suiteList = document.getElementById('suite-list');
  const liveLog = document.getElementById('live-log');
  const liveLogOutput = document.getElementById('live-log-output');

  const PROMPT = 'manta@demo:~$';

  const LIVE_DEMO_TEXT = '&#9679; LIVE DEMO — real Robot Framework tests running on a simulated device &#9679; ';

  let runButtons = [];

  function setAllButtonsDisabled(disabled) {
    runButtons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function setSuiteStatus(suiteId, text, kind) {
    const statusEl = document.querySelector(`.suite-status[data-suite="${suiteId}"]`);
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'suite-status' + (kind ? ` ${kind}` : '');
  }

  function setSuiteRunning(suiteId) {
    const statusEl = document.querySelector(`.suite-status[data-suite="${suiteId}"]`);
    if (!statusEl) return;
    statusEl.className = 'suite-status running';
    statusEl.innerHTML = `<span class="suite-status-track">${LIVE_DEMO_TEXT.repeat(3)}</span>`;
  }

  function hideReportButton(suiteId) {
    const reportButton = document.querySelector(`.report-button[data-suite="${suiteId}"]`);
    if (reportButton) reportButton.classList.add('hidden');
  }

  function showReportButton(suiteId, reportUrl) {
    const reportButton = document.querySelector(`.report-button[data-suite="${suiteId}"]`);
    if (!reportButton) return;
    reportButton.href = reportUrl;
    reportButton.classList.remove('hidden');
  }

  async function loadSuites() {
    const res = await fetch('/api/suites');
    const suites = await res.json();

    suiteList.innerHTML = '';
    suites.forEach((suite) => {
      const card = document.createElement('div');
      card.className = 'suite-card';
      card.innerHTML = `
        <div class="suite-info">
          <div class="suite-label">${suite.label}</div>
          <span class="suite-status" data-suite="${suite.id}"></span>
        </div>
        <div class="suite-actions">
          <button class="run-button" data-suite="${suite.id}">&#9654; Run</button>
          <a class="report-button hidden" data-suite="${suite.id}" href="#" target="_blank" rel="noopener">Report &rarr;</a>
        </div>
      `;
      suiteList.appendChild(card);
    });

    runButtons = Array.from(document.querySelectorAll('.run-button'));
    runButtons.forEach((button) => {
      button.addEventListener('click', () => startRun(button.dataset.suite));
    });
  }

  async function startRun(suiteId) {
    setSuiteStatus(suiteId, 'Starting...', '');
    try {
      const res = await fetch(`/api/run/${encodeURIComponent(suiteId)}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSuiteStatus(suiteId, data.error || 'Could not start run.', 'error');
      }
    } catch (err) {
      setSuiteStatus(suiteId, 'Network error while starting run.', 'error');
    }
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'start') {
        const command = message.fileName ? `robot ${message.fileName}` : 'robot';
        liveLogOutput.textContent = `${PROMPT} ${command}\n`;
        hideReportButton(message.suiteId);
        setAllButtonsDisabled(true);
        setSuiteRunning(message.suiteId);
      }

      if (message.type === 'line') {
        liveLogOutput.textContent += message.text;
        liveLog.scrollTop = liveLog.scrollHeight;
      }

      if (message.type === 'done') {
        setAllButtonsDisabled(false);
        if (message.exitCode === 0) {
          setSuiteStatus(message.suiteId, 'All tests passed.', 'success');
        } else if (message.exitCode > 0) {
          setSuiteStatus(message.suiteId, `${message.exitCode} test(s) failed.`, 'error');
        } else {
          setSuiteStatus(message.suiteId, 'Run failed to complete.', 'error');
        }
        if (message.reportUrl) {
          showReportButton(message.suiteId, message.reportUrl);
        }
      }
    });

    ws.addEventListener('close', () => {
      setTimeout(connectWebSocket, 2000);
    });
  }

  connectWebSocket();
  loadSuites();

  const fileButtons = document.querySelectorAll('.file-button');
  const codeContent = document.getElementById('code-content');

  async function loadFile(filename) {
    codeContent.textContent = 'Loading...';
    try {
      const res = await fetch(`/api/source/${encodeURIComponent(filename)}`);
      const text = await res.text();
      codeContent.textContent = res.ok ? text : `Error: ${text}`;
    } catch (err) {
      codeContent.textContent = 'Network error while loading file.';
    }
  }

  fileButtons.forEach((button) => {
    button.addEventListener('click', () => {
      fileButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      loadFile(button.dataset.file);
    });
  });

  loadFile(fileButtons[0].dataset.file);
})();
