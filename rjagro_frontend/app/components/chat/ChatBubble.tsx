'use client'
import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ChatPanel from './ChatPanel';

const ChatBubble: React.FC = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    if (!user) return null;

    return (
        <>
            {open && <ChatPanel onClose={() => setOpen(false)} />}
            <button
                onClick={() => setOpen(prev => !prev)}
                className={`
                    fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
                    flex items-center justify-center transition-all duration-200
                    ${open
                        ? 'bg-gray-700 hover:bg-gray-800'
                        : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                    }
                `}
                aria-label={open ? 'Close chat' : 'Open chat'}
                style={{ animation: 'ripple 2s infinite' }}
            >
                <MessageCircle size={24} className="text-white" />
            </button>
        </>
    );
};

export default ChatBubble;
