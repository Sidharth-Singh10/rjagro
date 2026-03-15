import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface FeedItem {
    itemName: string;
    qty: number;
    unit: string;
    kg: number;
}

interface SaleItem {
    quantity: number;
    avgWeight: number;
    totalWeight: number;
}

interface RequestBody {
    batchId: number;
    fcr: number;
    totalFeedKg: number;
    totalWeightKg: number;
    feedBreakdown: FeedItem[];
    salesBreakdown: SaleItem[];
}

const SYSTEM_PROMPT = `You are a poultry farming expert specializing in broiler production efficiency.
The user will provide a Feed Conversion Ratio (FCR) breakdown for a specific batch.
FCR = total feed consumed (kg) / total live weight sold (kg). A good FCR is below 1.6; above 2.0 is very poor.

Analyze the data and:
1. Identify the most likely reasons the FCR is high (e.g. feed wastage, poor feed quality, disease, environmental stress, breed issues, overfeeding relative to growth stage, high mortality eating into efficiency).
2. Provide 3-5 specific, actionable recommendations to improve FCR for future batches.

Keep the response concise (under 300 words). Use bullet points. Do not repeat the raw numbers back.`;

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const body: RequestBody = await req.json();
        const { batchId, fcr, totalFeedKg, totalWeightKg, feedBreakdown, salesBreakdown } = body;

        if (!batchId || !fcr) {
            return NextResponse.json(
                { error: 'batchId and fcr are required' },
                { status: 400 }
            );
        }

        const feedLines = feedBreakdown
            .map(f => `  - ${f.itemName}: ${f.qty} ${f.unit} = ${f.kg.toFixed(1)} kg`)
            .join('\n');

        const salesLines = salesBreakdown
            .map((s, i) => `  - Sale ${i + 1}: ${s.quantity} birds, avg weight ${s.avgWeight.toFixed(2)} kg, total ${s.totalWeight.toFixed(2)} kg`)
            .join('\n');

        const userPrompt = `Batch ${batchId} has an FCR of ${fcr.toFixed(2)}.

Feed consumed (${totalFeedKg.toFixed(1)} kg total):
${feedLines}

Live weight sold (${totalWeightKg.toFixed(2)} kg total):
${salesLines}

What likely went wrong and how can this be improved?`;

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: SYSTEM_PROMPT,
            },
        });

        const text = response.candidates?.[0]?.content?.parts
            ?.filter(p => p.text)
            .map(p => p.text!)
            .join('') ?? 'Could not generate analysis. Please try again.';

        return NextResponse.json({ analysis: text });
    } catch (err) {
        console.error('[FCR Analysis] Error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
