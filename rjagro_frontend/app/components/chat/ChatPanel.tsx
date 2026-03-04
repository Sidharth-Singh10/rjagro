'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I\'m the RJ Agro assistant. Ask me about batches, inventory, traders, suppliers, or anything else in the system.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage: Message = { role: 'user', content: trimmed };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                console.error('[ChatPanel] Chat API failed:', {
                    status: res.status,
                    statusText: res.statusText,
                    body: data,
                });
                throw new Error(data.error || `Chat request failed: ${res.status}`);
            }

            if (!data.content) {
                console.error('[ChatPanel] No content in response:', data);
                throw new Error('Invalid response: no content');
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        } catch (err) {
            console.error('[ChatPanel] Chat error:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong. Please try again. (${msg})` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div
            className="fixed bottom-20 right-6 w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
            style={{ animation: 'dropReveal 0.25s ease-out' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-600 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                        AI
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">RJ Agro Assistant</p>
                        <p className="text-xs text-green-100">Ask about your data</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                    aria-label="Close chat"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {messages.map((msg, i) => (
                    <ChatMessage key={i} role={msg.role} content={msg.content} />
                ))}
                {loading && (
                    <div className="flex justify-start mb-3">
                        <div className="w-7 h-7 flex-shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5">
                            AI
                        </div>
                        <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 text-sm flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about batches, inventory..."
                        disabled={loading}
                        className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 text-gray-800 placeholder-gray-400"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Send message"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
