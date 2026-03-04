import { toolRegistry } from './tools';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function executeTool(
    name: string,
    args: Record<string, unknown>,
    jwt: string
): Promise<unknown> {
    const meta = toolRegistry[name];
    if (!meta) {
        console.error('[Chat Executor] Unknown tool:', name);
        return { error: `Unknown tool: ${name}` };
    }

    let url = `${BACKEND_URL}${meta.endpoint}`;

    if (meta.pathParams) {
        for (const param of meta.pathParams) {
            const value = args[param];
            if (value === undefined || value === null) {
                return { error: `Missing required path parameter: ${param}` };
            }
            url = url.replace(`{${param}}`, String(value));
        }
    }

    const authHeader = jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`;

    try {
        console.log('[Chat Executor] Calling:', meta.method, url);
        const res = await fetch(url, {
            method: meta.method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('[Chat Executor] Backend error:', res.status, text.slice(0, 200));
            return { error: `Backend returned ${res.status}: ${text}` };
        }

        const data = await res.json();
        return data;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Chat Executor] Fetch failed:', msg);
        return { error: `Failed to call backend: ${msg}` };
    }
}
