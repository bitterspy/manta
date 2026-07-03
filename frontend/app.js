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
  const reportLinkWrap = document.getElementById('report-link-wrap');
  const reportLink = document.getElementById('report-link');

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
        <button class="run-button" data-suite="${suite.id}">&#9654; Run</button>
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
        liveLog.textContent = '';
        reportLinkWrap.classList.add('hidden');
        setAllButtonsDisabled(true);
        setSuiteStatus(message.suiteId, 'Running...', '');
      }

      if (message.type === 'line') {
        liveLog.textContent += message.text;
        liveLog.scrollTop = liveLog.scrollHeight;
      }

      if (message.type === 'done') {
        setAllButtonsDisabled(false);
        if (message.reportUrl) {
          reportLink.href = message.reportUrl;
          reportLinkWrap.classList.remove('hidden');
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
