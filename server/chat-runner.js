/**
 * chat-runner.js
 * SSE streaming engine for Jewelry Authority AI Analyst.
 *
 * Uses `claude --print` (Claude Code CLI, OAuth auth — no API key required).
 * Wraps stdout in SSE so the frontend gets a live stream rather than a
 * blocking 10-second HTTP POST.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// ── PATH augmentation (claude is in ~/.local/bin, not in Node's default PATH) ─
const EXTRA_PATHS = [
  `${process.env.HOME ?? '/root'}/.local/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/bin',
].join(':');

// Build child environment: augment PATH, and strip any placeholder ANTHROPIC_API_KEY
// so the claude CLI falls back to its OAuth session instead of failing with
// "Invalid API key" when the .env file has the unfilled placeholder value.
const CHILD_ENV = (() => {
  const env = { ...process.env, PATH: `${EXTRA_PATHS}:${process.env.PATH ?? ''}` };
  const key = env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith('your_') || key === 'sk-placeholder' || key.trim() === '') {
    delete env.ANTHROPIC_API_KEY;
  }
  return env;
})();

const CHAT_TIMEOUT_MS   = 90_000;   // 90-second hard timeout per turn
const POST_FINISH_TTL   = 90_000;   // keep finished run in memory for late SSE viewers

const runs = new Map();

// ── SSE helpers ───────────────────────────────────────────────────────────────

function emit(run, event, data) {
  run.events.push({ event, data, t: Date.now() });
  for (const client of run.sseClients) {
    try {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
      client.flush?.();
    } catch { /* client disconnected */ }
  }
}

function writeSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

function finalize(run) {
  run.done = true;
  emit(run, 'status', { status: 'finished' });
  for (const c of run.sseClients) { try { c.end(); } catch {} }
  run.sseClients.clear();
  setTimeout(() => runs.delete(run.runId), POST_FINISH_TTL);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attach an SSE response to an existing run.
 * Replays buffered events so late-connecting clients see the full stream.
 */
export function attachSse(runId, res) {
  const run = runs.get(runId);
  if (!run) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'run not found' }));
    return;
  }
  writeSseHeaders(res);
  // Replay everything emitted so far
  for (const e of run.events) {
    res.write(`event: ${e.event}\n`);
    res.write(`data: ${JSON.stringify(e.data)}\n\n`);
  }
  res.flush?.();
  if (run.done) { res.end(); return; }
  run.sseClients.add(res);
  res.on('close', () => run.sseClients.delete(res));
}

/**
 * Launch `claude --print` for `promptText`, stream stdout as SSE events.
 * Returns the runId immediately; the caller should open the SSE endpoint.
 */
export function startChat(promptText) {
  const runId = randomUUID();
  const run = {
    runId,
    events: [],
    sseClients: new Set(),
    done: false,
    proc: null,
  };
  runs.set(runId, run);

  // Fire-and-forget — give the caller the runId first, then process starts
  setImmediate(() => {
    let stderr = '';

    try {
      const proc = spawn('claude', ['--print'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: CHILD_ENV,
      });
      run.proc = proc;

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        emit(run, 'error', { message: 'Claude CLI timed out after 90 seconds.' });
        finalize(run);
      }, CHAT_TIMEOUT_MS);

      // Stream stdout as it arrives — each chunk is forwarded as assistant_text.
      // If `claude --print` buffers output (non-TTY), all text arrives at once
      // when the process ends; that still works — the SSE connection stays open
      // and the typing indicator stays visible until data arrives.
      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        if (text) emit(run, 'assistant_text', { text });
      });

      proc.stderr.on('data', (c) => { stderr += c.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const detail = stderr.trim().slice(0, 300) || `exit code ${code}`;
          if (detail.includes('not found') || detail.includes('ENOENT')) {
            emit(run, 'error', { message: 'Claude Code CLI not found. Install it at https://claude.ai/code' });
          } else if (detail.includes('auth') || detail.includes('login') || detail.includes('token')) {
            emit(run, 'error', { message: 'Claude Code CLI is not authenticated. Run `claude` in a terminal to log in.' });
          } else {
            emit(run, 'error', { message: `Claude CLI failed: ${detail}` });
          }
        } else {
          emit(run, 'result', { outcome: 'success' });
        }
        finalize(run);
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          emit(run, 'error', { message: 'Claude Code CLI not found. Install it at https://claude.ai/code' });
        } else {
          emit(run, 'error', { message: `Spawn error: ${err.message}` });
        }
        finalize(run);
      });

      // Write prompt to stdin
      try {
        proc.stdin.write(promptText, 'utf8');
        proc.stdin.end();
      } catch (writeErr) {
        clearTimeout(timer);
        proc.kill();
        emit(run, 'error', { message: `Failed to send prompt to Claude: ${writeErr.message}` });
        finalize(run);
      }

    } catch (spawnErr) {
      emit(run, 'error', { message: `Failed to start Claude: ${spawnErr.message}` });
      finalize(run);
    }
  });

  return runId;
}
