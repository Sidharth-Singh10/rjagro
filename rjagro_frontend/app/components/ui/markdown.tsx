'use client'

import dynamic from 'next/dynamic';

/**
 * Lazily loads react-markdown (only fetched when an AI message or
 * analysis panel actually renders).
 */
const Markdown = dynamic(() => import('./markdown_content'), {
    ssr: false,
    loading: () => null,
});

export type { Components } from 'react-markdown';
export default Markdown;
