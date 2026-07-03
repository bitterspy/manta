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

  function hideAllReportButtons() {
    document.querySelectorAll('.report-button').forEach((button) => {
      button.classList.add('hidden');
    });
  }

  function showReportButton(suiteId, reportUrl, passed) {
    const reportButton = document.querySelector(`.report-button[data-suite="${suiteId}"]`);
    if (!reportButton) return;
    reportButton.href = reportUrl;
    reportButton.classList.remove('hidden', 'success', 'error');
    reportButton.classList.add(passed ? 'success' : 'error');
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
        hideAllReportButtons();
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
          showReportButton(message.suiteId, message.reportUrl, message.exitCode === 0);
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

  let keywordIndex = {};

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Turns any occurrence of a known keyword name in a line of source code
  // into a clickable span that jumps to that keyword's definition, like
  // "go to definition" in an IDE. Only recognizes this project's own
  // keywords (from keywordIndex), not Robot Framework's built-ins.
  function linkifyLine(line, currentFilename) {
    const names = Object.keys(keywordIndex).sort((a, b) => b.length - a.length);
    if (names.length === 0) return escapeHtml(line);

    const pattern = new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const parts = line.split(pattern);

    return parts
      .map((part) => {
        const target = keywordIndex[part];
        if (!target) return escapeHtml(part);
        const isSelfDefinition = target.file === currentFilename;
        const cls = isSelfDefinition ? 'keyword-link keyword-link-self' : 'keyword-link';
        return `<span class="${cls}" data-target-file="${target.file}" data-target-line="${target.line}">${escapeHtml(part)}</span>`;
      })
      .join('');
  }

  function renderCode(filename, text) {
    const lines = text.split('\n');
    codeContent.innerHTML = lines
      .map((line, i) => `<span class="code-line" data-line="${i + 1}">${linkifyLine(line, filename)}</span>`)
      .join('\n');
  }

  function jumpToDefinition(filename, lineNumber) {
    const targetButton = document.querySelector(`.file-button[data-file="${filename}"]`);
    if (targetButton) {
      fileButtons.forEach((b) => b.classList.remove('active'));
      targetButton.classList.add('active');
    }
    loadFile(filename, lineNumber);
  }

  async function loadFile(filename, highlightLine) {
    codeContent.textContent = 'Loading...';
    try {
      if (Object.keys(keywordIndex).length === 0) {
        const indexRes = await fetch('/api/keyword-index');
        keywordIndex = await indexRes.json();
      }
      const res = await fetch(`/api/source/${encodeURIComponent(filename)}`);
      const text = await res.text();
      if (!res.ok) {
        codeContent.textContent = `Error: ${text}`;
        return;
      }
      renderCode(filename, text);

      codeContent.querySelectorAll('.keyword-link').forEach((el) => {
        el.addEventListener('click', () => {
          jumpToDefinition(el.dataset.targetFile, parseInt(el.dataset.targetLine, 10));
        });
      });

      if (highlightLine) {
        const lineEl = codeContent.querySelector(`.code-line[data-line="${highlightLine}"]`);
        if (lineEl) {
          lineEl.classList.add('highlighted-line');
          lineEl.scrollIntoView({ block: 'center' });
        }
      }
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
