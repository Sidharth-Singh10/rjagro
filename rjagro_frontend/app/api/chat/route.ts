import { NextRequest, NextResponse } from 'next/server';
import { chat } from './llm';

interface RequestBody {
    messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) {
            console.error('[Chat API] No token in cookies');
            return NextResponse.json(
                { error: 'Unauthorized — no token found' },
                { status: 401 }
            );
        }

        let userRole = 'supervisor';
        try {
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString()
            );
            userRole = payload.role?.toLowerCase() ?? 'supervisor';
        } catch (e) {
            console.warn('[Chat API] Could not decode JWT, using default role:', e);
        }

        const body: RequestBody = await req.json();
        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            console.error('[Chat API] Invalid body:', { messages: body?.messages });
            return NextResponse.json(
                { error: 'messages array is required' },
                { status: 400 }
            );
        }

        console.log('[Chat API] Processing chat:', { messageCount: body.messages.length, userRole });

        const content = await chat(body.messages, token, userRole);
        return NextResponse.json({ content });
    } catch (err) {
        console.error('[Chat API] Error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
