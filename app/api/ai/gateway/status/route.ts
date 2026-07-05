import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: logs } = await supabase.from('ai_gateway_logs').select('provider, latency_ms, success, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    const total = logs?.length || 0;
    const successes = logs?.filter(l => l.success).length || 0;
    const avgLatency = total > 0 ? Math.round(logs!.reduce((s, l) => s + (l.latency_ms || 0), 0) / total) : 0;
    const lastSuccess = logs?.find(l => l.success)?.created_at || null;
    const providerCounts: Record<string, number> = {};
    logs?.forEach(l => { providerCounts[l.provider] = (providerCounts[l.provider] || 0) + 1; });
    const primaryProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'anthropic';
    const fallbackRate = total > 0 ? Math.round(logs!.filter(l => l.provider?.includes('fallback')).length / total * 100) : 0;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN || '';
    return NextResponse.json({ status: 'operational', providers: { anthropic: { available: !!process.env.ANTHROPIC_API_KEY, primary: primaryProvider === 'anthropic' }, cloudflare: { available: !!cfToken, primary: primaryProvider === 'cloudflare', model: '@cf/moonshotai/kimi-k2.7-code' }, openrouter: { available: !!process.env.OPENROUTER_API_KEY, primary: primaryProvider === 'openrouter' } }, stats: { total_requests: total, success_rate: total > 0 ? Math.round(successes / total * 100) : 100, avg_latency_ms: avgLatency, fallback_rate: fallbackRate }, last_success: lastSuccess, last_request_at: logs?.[0]?.created_at || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
