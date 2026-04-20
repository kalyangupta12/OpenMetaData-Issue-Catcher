import http from "http";

const PORT = parseInt(process.env.PORT || "3000", 10);
const LOG_BUFFER_MAX = 300; // keep last 300 lines in memory

// ─── In-memory log ring buffer ─────────────────────────────────────────────
const logBuffer = [];
const sseClients = new Set();

/**
 * Append a log entry and broadcast to all SSE clients.
 * @param {"log"|"error"|"warn"} level
 * @param {string} message
 */
function broadcast(level, message) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
  };

  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();

  const ssePayload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(ssePayload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ─── Patch console to also broadcast ──────────────────────────────────────
const _log = console.log.bind(console);
const _error = console.error.bind(console);
const _warn = console.warn.bind(console);

console.log = (...args) => {
  const msg = args.join(" ");
  _log(msg);
  broadcast("log", msg);
};

console.error = (...args) => {
  const msg = args.join(" ");
  _error(msg);
  broadcast("error", msg);
};

console.warn = (...args) => {
  const msg = args.join(" ");
  _warn(msg);
  broadcast("warn", msg);
};

// ─── Dashboard HTML ────────────────────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OpenMetadata Issue Catcher — Live Logs</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --muted: #6e7681;
      --blue: #58a6ff;
      --green: #3fb950;
      --red: #f85149;
      --yellow: #d29922;
      --accent: #1f6feb;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      overflow: hidden;
    }

    .layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 16px;
      gap: 12px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #1f6feb, #388bfd);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .title h1 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      line-height: 1;
    }

    .title p {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid;
      transition: all 0.3s;
    }

    .status-badge.connected {
      background: rgba(63, 185, 80, 0.1);
      border-color: var(--green);
      color: var(--green);
    }

    .status-badge.disconnected {
      background: rgba(248, 81, 73, 0.1);
      border-color: var(--red);
      color: var(--red);
    }

    .status-badge.connecting {
      background: rgba(210, 153, 34, 0.1);
      border-color: var(--yellow);
      color: var(--yellow);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .dot.pulse {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Stats row */
    .stats {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .stat-card {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }
    .stat-value.blue { color: var(--blue); }
    .stat-value.yellow { color: var(--yellow); }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .toolbar-left {
      display: flex;
      gap: 6px;
    }

    .filter-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-btn:hover, .filter-btn.active {
      border-color: var(--accent);
      color: var(--blue);
      background: rgba(31, 111, 235, 0.1);
    }

    .filter-btn.active.log { border-color: var(--green); color: var(--green); background: rgba(63,185,80,0.1); }
    .filter-btn.active.error { border-color: var(--red); color: var(--red); background: rgba(248,81,73,0.1); }
    .filter-btn.active.warn { border-color: var(--yellow); color: var(--yellow); background: rgba(210,153,34,0.1); }

    .toolbar-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn:hover { border-color: var(--blue); color: var(--blue); }
    .btn.danger:hover { border-color: var(--red); color: var(--red); }

    .autoscroll-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      cursor: pointer;
      user-select: none;
    }

    .toggle {
      width: 28px;
      height: 16px;
      border-radius: 8px;
      background: var(--border);
      position: relative;
      transition: background 0.2s;
      cursor: pointer;
    }

    .toggle.on { background: var(--green); }

    .toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      transition: left 0.2s;
    }

    .toggle.on::after { left: 14px; }

    /* Terminal */
    .terminal {
      flex: 1;
      background: #010409;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .terminal-titlebar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .terminal-dot:nth-child(1) { background: #ff5f57; }
    .terminal-dot:nth-child(2) { background: #ffbd2e; }
    .terminal-dot:nth-child(3) { background: #28c840; }

    .terminal-title {
      font-size: 12px;
      color: var(--muted);
      margin-left: 6px;
      font-family: 'JetBrains Mono', monospace;
    }

    .log-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      line-height: 1.7;
      scroll-behavior: smooth;
    }

    .log-container::-webkit-scrollbar { width: 6px; }
    .log-container::-webkit-scrollbar-track { background: transparent; }
    .log-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .log-entry {
      display: flex;
      gap: 10px;
      padding: 1px 0;
      animation: fadeIn 0.15s ease-out;
    }

    .log-entry.hidden { display: none; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .log-ts {
      color: #3d444d;
      white-space: nowrap;
      flex-shrink: 0;
      font-size: 11px;
      padding-top: 1px;
    }

    .log-level {
      width: 44px;
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 5px;
      border-radius: 3px;
      text-align: center;
      align-self: flex-start;
      margin-top: 2px;
    }

    .log-level.log { background: rgba(63,185,80,0.15); color: var(--green); }
    .log-level.error { background: rgba(248,81,73,0.15); color: var(--red); }
    .log-level.warn { background: rgba(210,153,34,0.15); color: var(--yellow); }

    .log-msg {
      color: var(--text);
      word-break: break-word;
      white-space: pre-wrap;
      flex: 1;
    }

    .log-entry.level-error .log-msg { color: #ffa198; }
    .log-entry.level-warn .log-msg { color: #e3b341; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      color: var(--muted);
    }

    .empty-state .icon { font-size: 32px; }
    .empty-state p { font-size: 13px; }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="logo">🤖</div>
        <div class="title">
          <h1>OpenMetadata Issue Catcher</h1>
          <p>Live Log Stream • Powered by Gemini AI</p>
        </div>
      </div>
      <div id="statusBadge" class="status-badge connecting">
        <div class="dot pulse" id="statusDot"></div>
        <span id="statusText">Connecting...</span>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Logs</div>
        <div class="stat-value blue" id="statTotal">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Info</div>
        <div class="stat-value green" id="statLog">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Errors</div>
        <div class="stat-value red" id="statError">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Warnings</div>
        <div class="stat-value yellow" id="statWarn">0</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="filter-btn active" data-filter="all" onclick="setFilter('all', this)">All</button>
        <button class="filter-btn log" data-filter="log" onclick="setFilter('log', this)">Info</button>
        <button class="filter-btn error" data-filter="error" onclick="setFilter('error', this)">Errors</button>
        <button class="filter-btn warn" data-filter="warn" onclick="setFilter('warn', this)">Warnings</button>
      </div>
      <div class="toolbar-right">
        <div class="autoscroll-toggle" onclick="toggleAutoScroll()">
          <div class="toggle on" id="autoScrollToggle"></div>
          <span>Auto-scroll</span>
        </div>
        <button class="btn danger" onclick="clearLogs()">Clear</button>
      </div>
    </div>

    <!-- Terminal -->
    <div class="terminal">
      <div class="terminal-titlebar">
        <div class="terminal-dot"></div>
        <div class="terminal-dot"></div>
        <div class="terminal-dot"></div>
        <span class="terminal-title">issue-catcher — bash</span>
      </div>
      <div class="log-container" id="logContainer">
        <div class="empty-state" id="emptyState">
          <div class="icon">⏳</div>
          <p>Waiting for logs...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    let autoScroll = true;
    let currentFilter = 'all';
    const counts = { total: 0, log: 0, error: 0, warn: 0 };
    const container = document.getElementById('logContainer');
    const emptyState = document.getElementById('emptyState');
    let entryCount = 0;

    function formatTime(iso) {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    function appendLog(entry) {
      if (emptyState) emptyState.style.display = 'none';

      counts.total++;
      counts[entry.level] = (counts[entry.level] || 0) + 1;
      document.getElementById('statTotal').textContent = counts.total;
      document.getElementById('statLog').textContent = counts.log || 0;
      document.getElementById('statError').textContent = counts.error || 0;
      document.getElementById('statWarn').textContent = counts.warn || 0;

      const el = document.createElement('div');
      el.className = 'log-entry level-' + entry.level + (currentFilter !== 'all' && currentFilter !== entry.level ? ' hidden' : '');
      el.dataset.level = entry.level;
      el.id = 'log-' + (++entryCount);

      el.innerHTML =
        '<span class="log-ts">' + formatTime(entry.ts) + '</span>' +
        '<span class="log-level ' + entry.level + '">' + (entry.level === 'log' ? 'info' : entry.level) + '</span>' +
        '<span class="log-msg">' + escapeHtml(entry.message) + '</span>';

      container.appendChild(el);

      // Max 500 DOM entries
      const entries = container.querySelectorAll('.log-entry');
      if (entries.length > 500) entries[0].remove();

      if (autoScroll) container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.log-entry').forEach(el => {
        el.classList.toggle('hidden', filter !== 'all' && el.dataset.level !== filter);
      });
      if (autoScroll) container.scrollTop = container.scrollHeight;
    }

    function toggleAutoScroll() {
      autoScroll = !autoScroll;
      const toggle = document.getElementById('autoScrollToggle');
      toggle.classList.toggle('on', autoScroll);
      if (autoScroll) container.scrollTop = container.scrollHeight;
    }

    function clearLogs() {
      container.querySelectorAll('.log-entry').forEach(el => el.remove());
      Object.assign(counts, { total:0, log:0, error:0, warn:0 });
      ['statTotal','statLog','statError','statWarn'].forEach(id => document.getElementById(id).textContent = '0');
      emptyState && (emptyState.style.display = '');
    }

    // ─── SSE Connection ────────────────
    function connect() {
      const badge = document.getElementById('statusBadge');
      const dot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      badge.className = 'status-badge connecting';
      dot.className = 'dot pulse';
      statusText.textContent = 'Connecting...';

      const es = new EventSource('/logs');

      es.onopen = () => {
        badge.className = 'status-badge connected';
        dot.className = 'dot pulse';
        statusText.textContent = 'Live';
      };

      es.onmessage = (e) => {
        try {
          appendLog(JSON.parse(e.data));
        } catch {}
      };

      es.onerror = () => {
        badge.className = 'status-badge disconnected';
        dot.className = 'dot';
        statusText.textContent = 'Reconnecting...';
        es.close();
        setTimeout(connect, 3000);
      };
    }

    connect();
  </script>
</body>
</html>`;

// ─── HTTP Server ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));
    return;
  }

  // SSE log stream
  if (req.url === "/logs") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send buffered history first
    for (const entry of logBuffer) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });

    // Keep-alive ping every 25s
    const ping = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(ping);
        sseClients.delete(res);
      }
    }, 25000);

    req.on("close", () => clearInterval(ping));
    return;
  }

  // Dashboard
  if (req.url === "/" || req.url === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(DASHBOARD_HTML);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

/**
 * Start the log dashboard server.
 */
export function startDashboard() {
  server.listen(PORT, () => {
    console.log(`[Dashboard] 🌐 Live log viewer running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    _error("[Dashboard] Server error:", err.message);
  });
}
