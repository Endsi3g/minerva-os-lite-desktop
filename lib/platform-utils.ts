export type Platform = 'reach' | 'ai';

export function getPlatformUrl(target: Platform, path?: string): string {
  const tail = path || (target === 'ai' ? '/assistant' : '/today');

  if (target === 'ai') {
    const base = process.env.NEXT_PUBLIC_AI_PLATFORM_URL;
    return base ? `${base}${tail}` : tail;
  }

  const base = process.env.NEXT_PUBLIC_REACH_PLATFORM_URL;
  return base ? `${base}${tail}` : tail;
}

export function isAIPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const aiUrl = process.env.NEXT_PUBLIC_AI_PLATFORM_URL;
  if (!aiUrl) return false;
  try {
    const aiHost = new URL(aiUrl).hostname;
    return window.location.hostname === aiHost;
  } catch {
    return false;
  }
}
