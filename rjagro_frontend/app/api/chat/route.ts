import { NextRequest, NextResponse } from 'next/server';
import { chat } from './llm';

interface RequestBody {
    messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) {
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
        } catch {
            // fall back to supervisor if decode fails
        }

        const body: RequestBody = await req.json();
        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return NextResponse.json(
                { error: 'messages array is required' },
                { status: 400 }
            );
        }

        const content = await chat(body.messages, token, userRole);
        return NextResponse.json({ content });
    } catch (err) {
        console.error('Chat API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
