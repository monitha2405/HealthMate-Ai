import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { ChatMessage } from '../types';

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableMemory, setEnableMemory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Can you give me an overall summary of my health status and recent lab records?',
    'What are nutritious, high-protein vegetarian breakfast ideas for steady energy?',
    'How can I improve my sleep quality and reduce daily fatigue?',
    'What simple daily exercise routine do you recommend for healthy stamina and cholesterol?'
  ];

  useEffect(() => {
    async function initData() {
      try {
        const hist = await api.getChatHistory().catch(() => []);

        if (hist.length > 0) {
          setMessages(hist);
        } else {
          setMessages([
            {
              id: 'initial',
              role: 'assistant',
              content: `Hello! I am HealthMate AI, your personal health and wellness assistant.\n\nI can help answer your personal health queries, including:\n* **Nutritional Guidance & Meal Planning** (Tailored whole-food recommendations & dietary strategies)\n* **Health Records & Lab Summaries** (Concise, high-level overviews of your uploaded documents)\n* **Daily Fitness & Workouts** (Personalized exercise routines for stamina and vitality)\n* **Wellness & Lifestyle Habits** (Sleep optimization, hydration pacing, and stress resilience)\n\nWhat personal health question can I help you with today?`,
              timestamp: new Date().toISOString(),
              agentUsed: 'Central Orchestrator'
            }
          ]);
        }
      } catch (e) {
        console.warn('Could not load assistant data:', e);
      }
    }
    initData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text.trim(), messages, enableMemory);
      setMessages(prev => [...prev, response]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ Error communicating with assistant: ${err.message || 'Please check your connection and try again.'}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear assistant conversation history?')) return;
    try {
      await api.clearChatHistory();
      setMessages([
        {
          id: 'reset',
          role: 'assistant',
          content: 'Conversation history cleared. What personal health questions can I help you with today?',
          timestamp: new Date().toISOString(),
          agentUsed: 'Central Orchestrator'
        }
      ]);
    } catch (e: any) {
      alert('Failed to clear history: ' + e.message);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-3 animate-in fade-in duration-150">
      <DisclaimerBanner compact />

      {/* Main Chat Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
        {/* Top bar controls */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">HealthMate Personal Assistant</span>
            <span className="text-[10px] bg-teal-50 text-[#07566A] font-semibold px-2 py-0.5 rounded-full border border-teal-200">
              Personal Health Q&A
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableMemory}
                onChange={e => setEnableMemory(e.target.checked)}
                className="rounded text-[#0FAEAE] focus:ring-teal-500 w-3.5 h-3.5"
              />
              <span>Remember context</span>
            </label>

            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isEmergency = msg.isEmergencyAlert;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                      isEmergency
                        ? 'bg-rose-600'
                        : 'bg-[#07566A]'
                    }`}
                  >
                    {isEmergency ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-2 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#07566A] text-white rounded-tr-none'
                      : isEmergency
                      ? 'bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-tl-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {!isUser && msg.agentUsed && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-800 border-b border-slate-200/60 pb-1.5">
                      <Sparkles className="w-3 h-3 text-[#0FAEAE]" />
                      <span>{msg.agentUsed}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Sources Consulted
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600"
                          >
                            <FileText className="w-2.5 h-2.5 text-[#0FAEAE]" />
                            <span>{s.documentTitle}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`text-[10px] ${isUser ? 'text-teal-100' : 'text-slate-400'} text-right`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-xl bg-[#07566A] text-white flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#21C4B8]" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <span>HealthMate Assistant is answering your health query...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="px-5 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-[11px] bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any personal health, nutrition, fitness, or wellness question..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#0FAEAE] hover:bg-[#21C4B8] text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
