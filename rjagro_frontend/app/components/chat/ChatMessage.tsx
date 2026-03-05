'use client'
import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5 first:mt-0">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-semibold mt-1 mb-0.5 first:mt-0">{children}</h4>,
    ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ className, children, ...props }) => {
        const isBlock = className?.startsWith('language-');
        return isBlock ? (
            <code className="font-mono text-xs block" {...props}>{children}</code>
        ) : (
            <code className="px-1.5 py-0.5 rounded bg-gray-200/80 font-mono text-xs" {...props}>
                {children}
            </code>
        );
    },
    pre: ({ children }) => (
        <pre className="my-1.5 overflow-x-auto rounded bg-gray-200/80 p-2.5 text-xs">{children}</pre>
    ),
    table: ({ children }) => (
        <div className="my-2 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-200/80">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
    th: ({ children }) => (
        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

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
                    max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                    ${isUser
                        ? 'bg-green-600 text-white rounded-br-md whitespace-pre-wrap'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200 [&_pre]:whitespace-pre-wrap'
                    }
                `}
            >
                {isUser ? (
                    content
                ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {content}
                    </ReactMarkdown>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
