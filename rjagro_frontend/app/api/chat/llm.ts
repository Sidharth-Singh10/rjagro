import { GoogleGenAI, Content, Part, FunctionCall } from '@google/genai';
import { functionDeclarations } from './tools';
import { executeTool } from './executor';
import { buildSystemPrompt } from './system-prompt';

const MAX_TOOL_ROUNDS = 8;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

function messagesToContents(messages: ChatMessage[]): Content[] {
    return messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));
}

function extractFunctionCalls(parts: Part[]): FunctionCall[] {
    const calls: FunctionCall[] = [];
    for (const part of parts) {
        if (part.functionCall) {
            calls.push(part.functionCall);
        }
    }
    return calls;
}

function extractTextContent(parts: Part[]): string {
    return parts
        .filter((p) => p.text)
        .map((p) => p.text!)
        .join('');
}

export async function chat(
    messages: ChatMessage[],
    jwt: string,
    userRole: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = buildSystemPrompt(userRole);
    const contents: Content[] = messagesToContents(messages);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations }],
            },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
            return 'Sorry, I could not generate a response. Please try again.';
        }

        const parts = candidate.content.parts;
        const fnCalls = extractFunctionCalls(parts);

        if (fnCalls.length === 0) {
            return extractTextContent(parts) || 'No response generated.';
        }

        contents.push({
            role: 'model',
            parts: parts,
        });

        const responseParts: Part[] = [];
        for (const fc of fnCalls) {
            const result = await executeTool(
                fc.name!,
                (fc.args as Record<string, unknown>) ?? {},
                jwt
            );
            responseParts.push({
                functionResponse: {
                    name: fc.name!,
                    response: result as Record<string, unknown>,
                },
            });
        }

        contents.push({
            role: 'user',
            parts: responseParts,
        });
    }

    return 'I made too many data lookups trying to answer your question. Could you try a more specific query?';
}
