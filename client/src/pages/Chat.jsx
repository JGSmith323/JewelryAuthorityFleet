import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, RefreshCw, Maximize2 } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const WS_URL = `ws://${window.location.hostname}:3001/ws/terminal`;

export default function Chat() {
  const mountRef  = useRef(null);   // DOM element xterm mounts into
  const termRef   = useRef(null);   // { term, fitAddon }
  const wsRef     = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | ready | error | closed

  function boot() {
    // Clean up any previous session
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (termRef.current) {
      termRef.current.term.dispose();
      termRef.current = null;
    }

    setStatus('connecting');

    // ── xterm setup ────────────────────────────────────────────────────────
    const term = new Terminal({
      theme: {
        background:    '#0F172A',   // deep navy — matches app palette
        foreground:    '#E2E8F0',
        cursor:        '#D97706',   // gold cursor
        cursorAccent:  '#0F172A',
        selectionBackground: '#334155',
        black:         '#1E293B',
        red:           '#F87171',
        green:         '#34D399',
        yellow:        '#FBBF24',
        blue:          '#60A5FA',
        magenta:       '#A78BFA',
        cyan:          '#22D3EE',
        white:         '#E2E8F0',
        brightBlack:   '#475569',
        brightRed:     '#FCA5A5',
        brightGreen:   '#6EE7B7',
        brightYellow:  '#FDE68A',
        brightBlue:    '#93C5FD',
        brightMagenta: '#C4B5FD',
        brightCyan:    '#67E8F9',
        brightWhite:   '#F8FAFC',
      },
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 2000,
    });

    const fitAddon      = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(mountRef.current);

    // Small delay so the DOM has laid out before fitting
    setTimeout(() => fitAddon.fit(), 50);

    termRef.current = { term, fitAddon };

    // ── WebSocket ──────────────────────────────────────────────────────────
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      term.write('\r\n  \x1b[1;33m◆\x1b[0m  \x1b[1mJewelry Authority — AI Analyst\x1b[0m\r\n');
      term.write('  \x1b[90mConnecting to Claude Code...\x1b[0m\r\n\r\n');
      setStatus('connecting');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'output') {
          term.write(msg.data);
          if (status !== 'ready') setStatus('ready');
        }
        if (msg.type === 'exit') {
          term.write('\r\n\x1b[90m[Session ended — click Reconnect to start a new session]\x1b[0m\r\n');
          setStatus('closed');
        }
        if (msg.type === 'error') {
          term.write(`\r\n\x1b[1;31m✖  ${msg.message}\x1b[0m\r\n`);
          setStatus('error');
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (status !== 'closed') {
        term.write('\r\n\x1b[90m[Connection closed]\x1b[0m\r\n');
        setStatus('closed');
      }
    };

    ws.onerror = () => {
      term.write('\r\n\x1b[1;31m✖  Could not connect to terminal server. Is the backend running?\x1b[0m\r\n');
      setStatus('error');
    };

    // Keyboard input → server
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
        if (status !== 'ready') setStatus('ready');
      }
    });

    // Window resize → fit + notify server
    function onResize() {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    }
    window.addEventListener('resize', onResize);

    // Return cleanup so React's useEffect can tear down on unmount
    return () => {
      window.removeEventListener('resize', onResize);
      ws.onclose = null;
      ws.close();
      term.dispose();
    };
  }

  // Auto-boot once on mount
  useEffect(() => {
    const cleanup = boot();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = {
    connecting: { text: 'Connecting…',  dot: 'bg-yellow-400 animate-pulse' },
    ready:      { text: 'Connected',    dot: 'bg-emerald-400' },
    error:      { text: 'Error',        dot: 'bg-red-400' },
    closed:     { text: 'Session ended',dot: 'bg-slate-400' },
  }[status];

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-3">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TerminalIcon className="text-gold-500" size={22} />
            AI Analyst
          </h1>
          <p className="text-sm text-slate-500">
            Claude Code terminal — auto-starts when you open this page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className={`w-2 h-2 rounded-full ${statusLabel.dot}`} />
            {statusLabel.text}
          </span>

          {/* Reconnect button */}
          <button
            onClick={() => boot()}
            className="btn-ghost text-xs"
            title="Start a new session"
          >
            <RefreshCw size={13} /> Reconnect
          </button>

          {/* Platform badge */}
          <span className="chip bg-gradient-to-r from-purple-100 to-amber-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 text-xs">
            <TerminalIcon size={11} /> Claude Code CLI
          </span>
        </div>
      </div>

      {/* Terminal window */}
      <div
        className="flex-1 rounded-xl overflow-hidden border border-slate-700 shadow-2xl"
        style={{ background: '#0F172A', minHeight: 0 }}
      >
        {/* Fake macOS traffic lights for polish */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 bg-slate-900">
          <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
          <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          <span className="ml-3 text-xs text-slate-500 font-mono">claude — Jewelry Authority AI Analyst</span>
          <Maximize2 size={11} className="ml-auto text-slate-600" />
        </div>

        {/* xterm.js mounts here */}
        <div
          ref={mountRef}
          className="w-full"
          style={{ height: 'calc(100% - 30px)', padding: '8px 4px 4px' }}
        />
      </div>

    </div>
  );
}
