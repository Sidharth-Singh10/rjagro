'use client'

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
    children: string;
    components?: Components;
}

/**
 * Statically imports react-markdown + remark-gfm so both live in a
 * single lazily-fetched chunk. Consumers import the wrapper instead,
 * keeping markdown out of the main bundle.
 */
export default function MarkdownContent({ children, components }: MarkdownContentProps) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {children}
        </ReactMarkdown>
    );
}
