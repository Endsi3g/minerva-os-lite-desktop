import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString(), providers: { anthropic: !!process.env.ANTHROPIC_API_KEY, openrouter: !!process.env.OPENROUTER_API_KEY } });
}
