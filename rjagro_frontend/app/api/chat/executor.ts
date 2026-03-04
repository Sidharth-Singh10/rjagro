import { toolRegistry } from './tools';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function executeTool(
    name: string,
    args: Record<string, unknown>,
    jwt: string
): Promise<unknown> {
    const meta = toolRegistry[name];
    if (!meta) {
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

    try {
        const res = await fetch(url, {
            method: meta.method,
            headers: {
                'Authorization': jwt,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const text = await res.text();
            return { error: `Backend returned ${res.status}: ${text}` };
        }

        return await res.json();
    } catch (err) {
        return { error: `Failed to call backend: ${err instanceof Error ? err.message : String(err)}` };
    }
}
