import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Minimize2,
  Maximize2,
  ChevronDown,
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface SmartAiChatWidgetProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const SmartAiChatWidget: React.FC<SmartAiChatWidgetProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: '👋 Hello! I am **SmartAssist AI**, powered by Google Gemini 2.5. I can answer questions about filing complaints, SLAs, escalation policies, or campus maintenance workflows. How can I help you today?',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ answer: string }>('/complaints/ai-assistant', {
        question,
      });

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer || 'I am sorry, I could not generate an answer right now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: '⚠️ Apologies, I encountered an issue reaching the Gemini AI service. Please verify your connection or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'How do I submit a new complaint?',
    'What are the SLA turnaround times?',
    'How does priority triage work?',
    'What happens if an SLA breaches?',
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xs rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 cursor-pointer border border-white/20"
          aria-label="Open SmartAssist AI"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white animate-ping" />
          </div>
          <span className="tracking-wide">Ask Gemini AI</span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[560px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Bot className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight">SmartAssist AI</h3>
                  <span className="text-[9px] bg-white/25 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Gemini 2.5
                  </span>
                </div>
                <p className="text-[10px] text-purple-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online & Ready
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  {m.text}
                  <span
                    className={`block text-[9px] mt-1.5 ${
                      m.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-500 dark:text-slate-400 text-xs animate-pulse">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                </div>
                <span>Gemini AI is formulating a response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 rounded-full border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                >
                  {qp}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask anything about complaints or facilities..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
