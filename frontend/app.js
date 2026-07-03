// app.js
// Handles tab switching, the WebSocket live log stream, the Run button,
// and fetching source files for the Code tab.

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

  const runButton = document.getElementById('run-button');
  const runStatus = document.getElementById('run-status');
  const liveLog = document.getElementById('live-log');
  const reportLinkWrap = document.getElementById('report-link-wrap');
  const reportLink = document.getElementById('report-link');

  function setStatus(text, kind) {
    runStatus.textContent = text;
    runStatus.className = 'run-status' + (kind ? ` ${kind}` : '');
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'start') {
        liveLog.textContent = '';
        reportLinkWrap.classList.add('hidden');
        runButton.disabled = true;
        setStatus('Running...', '');
      }

      if (message.type === 'line') {
        liveLog.textContent += message.text;
        liveLog.scrollTop = liveLog.scrollHeight;
      }

      if (message.type === 'done') {
        runButton.disabled = false;
        if (message.exitCode === 0 || message.exitCode === 1) {
          // Robot Framework returns the number of failed tests as the exit
          // code, so 0 = all passed, >0 = some failed but the run itself
          // completed successfully.
          setStatus('Run finished.', 'success');
        } else {
          setStatus('Run failed to complete.', 'error');
        }
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

  runButton.addEventListener('click', async () => {
    setStatus('Starting...', '');
    try {
      const res = await fetch('/api/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Could not start run.', 'error');
      }
    } catch (err) {
      setStatus('Network error while starting run.', 'error');
    }
  });

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
