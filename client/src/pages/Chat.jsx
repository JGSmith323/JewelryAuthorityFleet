import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2, User, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';

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
  const [sessionId]            = useState(() => getSessionId());
  const [messages, setMessages]= useState([]);
  const [input, setInput]      = useState('');
  const [sending, setSending]  = useState(false);
  const [status, setStatus]    = useState({ configured: true, model: 'claude-sonnet-4-6' });
  const scrollRef              = useRef(null);

  useEffect(() => {
    api.chatStatus().then(setStatus).catch(() => {});
    api.chatHistory(sessionId).then((r) => setMessages(r.messages || [])).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput('');
    const next = [...messages, { role: 'user', content: value }];
    setMessages(next);
    setSending(true);
    try {
      const res = await api.chatSend(next, sessionId);
      setMessages((m) => [...m, res.message]);
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: err?.body?.code === 'NOT_CONFIGURED'
          ? 'I cannot respond yet - the ANTHROPIC_API_KEY is not configured. See API_KEYS.md.'
          : `Error: ${err.message}`,
      }]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    await api.chatClear(sessionId);
    setMessages([]);
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-gold-500" /> AI Analyst
          </h1>
          <p className="text-sm text-slate-500">Ask Claude about your data. The assistant has live context on revenue, orders, inventory and platforms.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip bg-gradient-to-r from-purple-100 to-amber-100 text-slate-700 border border-slate-200">
            Powered by Claude {status.model}
          </span>
          <button onClick={clearChat} className="btn-ghost"><Trash2 size={14} /> Clear</button>
        </div>
      </div>

      {!status.configured && (
        <div className="card bg-amber-50 border-amber-200 mb-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-800">
            <strong>Add your ANTHROPIC_API_KEY to .env to enable AI chat.</strong>
            <div className="mt-1 text-amber-700">Restart `npm run dev` after editing .env. See API_KEYS.md for the setup walkthrough.</div>
          </div>
        </div>
      )}

      {/* Sample prompts */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {SAMPLE_PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} className="text-left card hover:border-gold-500 transition text-sm text-slate-700">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto card p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <Sparkles size={28} className="mx-auto text-gold-500 mb-2" />
            <div>Ask anything about your business data.</div>
          </div>
        )}
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {sending && <Bubble role="assistant" content={<span className="opacity-60">Thinking...</span>} />}
      </div>

      {/* Input */}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
          placeholder="Ask about top products, platform performance, low stock..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || !status.configured}
        />
        <button type="submit" className="btn-primary px-4 py-3" disabled={sending || !input.trim() || !status.configured}>
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-purple-600 to-gold-500 text-white'
      }`}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
        isUser
          ? 'bg-navy-900 text-white rounded-tr-sm'
          : 'bg-slate-100 text-slate-800 rounded-tl-sm'
      }`}>
        {content}
      </div>
    </div>
  );
}
