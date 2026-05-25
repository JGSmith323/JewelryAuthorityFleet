import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, User, RotateCcw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

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

function buildGreeting(demoEnabled) {
  return demoEnabled
    ? `Hey! 👋 I'm your **Jewelry Authority AI Analyst** — running on **demo data** right now.\n\nI can see your sample catalog across eBay, Shopify, your website, and Salesforce. Ask me anything about the demo figures — revenue, top sellers, low stock, platform comparisons.`
    : `Hey! 👋 I'm your **Jewelry Authority AI Analyst**.\n\nConnect your platforms and I'll give you live insights across eBay, Shopify, your website, and Salesforce. Or enable **Demo Mode** to explore with sample data.`;
}

export default function Chat() {
  const { enabled: demoEnabled, tick } = useDemo();
  const [sessionId, setSessionId]  = useState(() => getSessionId());
  const [messages, setMessages]    = useState(() => [{ role: 'assistant', content: buildGreeting(false) }]);
  const [input, setInput]          = useState('');
  const [sending, setSending]      = useState(false);
  const [error, setError]          = useState(null);
  const scrollRef                  = useRef(null);
  const prevTickRef                = useRef(tick);

  // Update greeting when demo mode changes
  useEffect(() => {
    if (tick !== prevTickRef.current) {
      prevTickRef.current = tick;
      // Only reset if there's no real conversation (just the greeting)
      setMessages(prev => {
        const hasRealConvo = prev.some(m => m.role === 'user');
        if (hasRealConvo) return prev;
        return [{ role: 'assistant', content: buildGreeting(demoEnabled) }];
      });
    }
  }, [tick, demoEnabled]);

  // Restore history on load
  useEffect(() => {
    const active = { current: true };
    api.chatHistory(sessionId).then((r) => {
      if (!active.current) return;
      if (r.messages?.length > 0) setMessages(r.messages);
    }).catch(() => {});
    return () => { active.current = false; };
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput('');
    setError(null);

    // Filter out the local greeting — it's display-only, not stored history
    const history = messages.filter(m => !m.content?.startsWith('Hey! 👋'));
    const next    = [...history, { role: 'user', content: value }];
    setMessages(next);
    setSending(true);

    try {
      const res = await api.chatSend(next, sessionId);
      setMessages(m => [...m, res.message]);
    } catch (err) {
      const code = err?.body?.code;
      if (code === 'CLI_UNAVAILABLE') {
        setError('Claude Code CLI is not running. Open a terminal, run `claude` to authenticate, then restart the server.');
      } else {
        setError(`Request failed: ${err.message || 'unknown error'}. Try again.`);
      }
      // Put the user message back in input so they can retry
      setInput(value);
      setMessages(prev => prev.filter(m => m !== next[next.length - 1]));
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    const newId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('ja_chat_session', newId);
    try { await api.chatClear(sessionId); } catch { /* ok */ }
    setSessionId(newId);
    setMessages([{ role: 'assistant', content: buildGreeting(demoEnabled) }]);
    setError(null);
  }

  const showPrompts = !messages.some(m => m.role === 'user') && !sending;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-gold-500" size={22} />
            AI Analyst
            {demoEnabled && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Demo Data
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {demoEnabled
              ? 'Answering from demo sample data · Powered by Claude Code CLI'
              : 'Powered by Claude Code CLI · Connect platforms for live insights'}
          </p>
        </div>
        <button onClick={clearChat} className="btn-ghost text-xs">
          <RotateCcw size={13} /> New chat
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}

        {sending && (
          <div className="flex items-end gap-2">
            <Avatar />
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {showPrompts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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

      {/* Input */}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent placeholder:text-slate-400"
          placeholder={demoEnabled ? 'Ask about demo data — top sellers, revenue, inventory…' : 'Ask about your sales, inventory, platforms…'}
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

function Avatar({ user }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
      user ? 'bg-slate-700 text-white' : 'bg-gradient-to-br from-violet-600 to-amber-500 text-white'
    }`}>
      {user ? <User size={14} /> : <Sparkles size={13} />}
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';

  function renderContent(text) {
    if (typeof text !== 'string') return text;
    return text.split('\n').map((line, i, arr) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j}>{p.slice(2, -2)}</strong>
          : p
      );
      return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
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
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}
