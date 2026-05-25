/**
 * terminal.js — WebSocket-based pseudo-terminal server
 *
 * Each WebSocket connection spawns its own `claude` process via node-pty.
 * The client (xterm.js) sends keyboard input and resize events; the server
 * streams raw PTY output back. Claude auto-starts the moment the page loads.
 */

import { WebSocketServer } from 'ws';
import pty from 'node-pty';

// Augment PATH so `claude` resolves even when Node was started without a
// full login shell (e.g., via concurrently or systemd).
const EXTRA_PATHS = [
  `${process.env.HOME ?? '/root'}/.local/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/bin',
].join(':');

const CHILD_ENV = {
  ...process.env,
  PATH: `${EXTRA_PATHS}:${process.env.PATH ?? ''}`,
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
  FORCE_COLOR: '1',
};

export function setupTerminalWS(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/terminal' });

  wss.on('connection', (ws) => {
    let shell;

    try {
      shell = pty.spawn('claude', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: process.env.HOME ?? process.cwd(),
        env: CHILD_ENV,
      });
    } catch (err) {
      const msg = err.code === 'ENOENT'
        ? 'Claude Code CLI not found. Install it at https://claude.ai/code'
        : `Failed to start Claude: ${err.message}`;
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: msg }));
        ws.close();
      }
      return;
    }

    // Stream PTY output → client
    shell.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    shell.on('exit', (code) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', code }));
        ws.close();
      }
    });

    // Client → PTY input / resize
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'input' && shell)  shell.write(msg.data);
        if (msg.type === 'resize' && shell) shell.resize(
          Math.max(1, msg.cols),
          Math.max(1, msg.rows),
        );
      } catch { /* ignore malformed frames */ }
    });

    ws.on('close', () => {
      try { shell.kill(); } catch { /* already dead */ }
    });
  });

  return wss;
}
