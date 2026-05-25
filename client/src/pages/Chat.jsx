import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2, User, RotateCcw } from 'lucide-react';
import { api } from '../lib/api.js';

const GREETING = `Hey! 👋 I'm your **Jewelry Authority AI Analyst**. I have live access to your sales data across eBay, Shopify, your website, and Salesforce.

Ask me anything — top sellers, platform comparisons, low inventory alerts, revenue trends, customer insights — I've got you covered.`;

const SAMPLE_PROMPTS = [
  'What were my top selling items last month?',
  'Which platform is performing best?',
  'What products are running low on inventory?',
  'Compare eBay vs Shopify revenue.',
];

function getSessionId() {
  let id = localStorage.getItem('ja_chat_session');
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('ja_chat_session', id);
  }
  return id;
}

export default function Chat() {
  const [sessionId]             = useState(() => getSessionId());
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const scrollRef               = useRef(null);

  // Restore history on load (skip if only the local greeting exists)
  useEffect(() => {
    api.chatHistory(sessionId).then((r) => {
      if (r.messages?.length > 0) setMessages(r.messages);
    }).catch(() => {});
  }, [sessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput('');

    // Exclude the local greeting from what we send — it's display-only, not real history
    const history = messages.filter(m => m.content !== GREETING);
    const next = [...history, { role: 'user', content: value }];
    setMessages(next);
    setSending(true);

    try {
      const res = await api.chatSend(next, sessionId);
      setMessages(m => [...m, res.message]);
    } catch (err) {
      const code = err?.body?.code;
      setMessages(m => [...m, {
        role: 'assistant',
        content: code === 'CLI_UNAVAILABLE'
          ? '⚠️ Claude Code CLI is not running. Open a terminal, run `claude`, authenticate, then restart the server.'
          : `Something went wrong: ${err.message}`,
      }]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    try {
      await api.chatClear(sessionId);
    } catch { /* server error — still clear locally */ }
    setMessages([{ role: 'assistant', content: GREETING }]);
  }

  const showPrompts = messages.length <= 1;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-gold-500" size={22} />
            AI Analyst
          </h1>
          <p className="text-sm text-slate-500">
            Powered by Claude Code CLI · Ask anything about your business data
          </p>
        </div>
        <button onClick={clearChat} className="btn-ghost text-xs">
          <RotateCcw size={13} /> New chat
        </button>
      </div>

      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-end gap-2">
            <Avatar />
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Sample prompts — only shown before first user message */}
        {showPrompts && !sending && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-left text-sm text-slate-600 bg-white border border-slate-200 hover:border-gold-400 hover:text-slate-900 rounded-xl px-4 py-3 transition shadow-sm"
              >
                {p}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Input bar */}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent placeholder:text-slate-400"
          placeholder="Ask about sales, inventory, platforms…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          autoFocus
        />
        <button
          type="submit"
          className="btn-primary px-4 py-3 rounded-xl"
          disabled={sending || !input.trim()}
        >
          <Send size={15} />
        </button>
      </form>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
      user
        ? 'bg-slate-700 text-white'
        : 'bg-gradient-to-br from-violet-600 to-amber-500 text-white'
    }`}>
      {user ? <User size={14} /> : <Sparkles size={13} />}
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';

  // Render very basic markdown: **bold** and newlines
  function renderContent(text) {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      );
      return <span key={i}>{parts}{i < text.split('\n').length - 1 && <br />}</span>;
    });
  }

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[75%] bg-navy-900 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-sm">
          {content}
        </div>
        <Avatar user />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div className="max-w-[75%] bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-800 shadow-sm leading-relaxed">
        {renderContent(content)}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
