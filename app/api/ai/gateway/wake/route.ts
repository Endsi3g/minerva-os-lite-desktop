import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ woken: true, providers: { anthropic: !!process.env.ANTHROPIC_API_KEY, openrouter: !!process.env.OPENROUTER_API_KEY }, message: 'Gateway is ready', timestamp: new Date().toISOString() });
}
