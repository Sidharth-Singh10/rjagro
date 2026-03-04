'use client'
import React from 'react';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
            {!isUser && (
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5">
                    AI
                </div>
            )}
            <div
                className={`
                    max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                    ${isUser
                        ? 'bg-green-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
                    }
                `}
            >
                {content}
            </div>
        </div>
    );
};

export default ChatMessage;
