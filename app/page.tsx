'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MinervaIcon } from '@/components/icons';
import { TextureOverlay } from '@/components/ui/texture-overlay';
import { startGuestSession } from '@/lib/guest-mode';
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [startingGuest, setStartingGuest] = useState(false);

  const handleTryAsGuest = async () => {
    setStartingGuest(true);
    const { error } = await startGuestSession();
    if (error) {
      toast.error(error);
      setStartingGuest(false);
      return;
    }
    router.push('/today');
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/today');
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f7f7f4] text-[#26251e] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
          <span className="text-[11px] font-medium tracking-wider text-[#7a7a76] uppercase">Minerva OS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-white text-[#26251e] font-sans selection:bg-[#10b981]/10 flex flex-col justify-between overflow-x-hidden relative">
      <TextureOverlay texture="grid" opacity={0.6} />

      <div className="flex-grow flex flex-col justify-between min-h-screen">
        <header className="flex h-16 items-center justify-between px-8 md:px-16 border-b border-[#e6e5e0] bg-white">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-[#26251e]">
            <MinervaIcon size={22} className="text-[#10b981]" />
            <span className="text-sm">Minerva Reach</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#555552]">
            <span className="cursor-pointer hover:text-[#26251e] transition-colors">Minerva Agents</span>
            <span className="cursor-pointer hover:text-[#26251e] transition-colors">Minerva Learn</span>
            <span className="cursor-pointer hover:text-[#26251e] transition-colors">Mission</span>
            <span className="cursor-pointer hover:text-[#26251e] transition-colors">Careers</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTryAsGuest}
              disabled={startingGuest}
              className="text-xs font-bold text-[#10b981] hover:text-[#059669] transition-colors cursor-pointer disabled:opacity-60"
            >
              {startingGuest ? 'Préparation…' : 'Essayer sans compte'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white px-5 py-1.5 text-xs font-bold transition-all cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center py-16 px-6 max-w-7xl mx-auto w-full">
          <h1
            className="text-5xl md:text-7xl tracking-tight text-center max-w-4xl text-[#26251e] mb-12 font-light leading-tight font-serif font-georgia"
          >
            Superintelligence <br className="hidden sm:inline" /> for local sales
          </h1>
          <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-widest mb-6">Our products</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            {/* Card 1 */}
            <div className="bg-[#0c0c0b] text-white rounded-2xl p-8 border border-neutral-800 flex flex-col justify-between aspect-[4/3] relative overflow-hidden group">
              <div className="space-y-3 relative z-10">
                <h3 className="text-xl font-bold tracking-tight text-white font-serif font-georgia">Minerva Agents</h3>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">AI agents designed to autonomously qualify and target local prospecting campaigns for your agency.</p>
              </div>
              <div className="flex gap-3 pt-6 relative z-10">
                <button onClick={() => router.push('/login')} className="bg-white hover:bg-neutral-100 text-black rounded-full px-5 py-2 text-xs font-bold transition-colors cursor-pointer animate-none">Explore</button>
                <button onClick={() => router.push('/login')} className="bg-[#10b981] hover:bg-[#059669] text-black rounded-full px-5 py-2 text-xs font-bold transition-colors cursor-pointer animate-none">Book an intro</button>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-neutral-900 rounded-tl-2xl border-l border-t border-neutral-800 p-4 opacity-75 group-hover:scale-105 transition-transform duration-500 ease-out">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-16 bg-[#10b981]/10 rounded border border-[#10b981]/20 p-2 text-[8px] text-[#10b981] font-mono">🤖 Qualifying bakeries in Paris...</div>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-[#f7f7f4] text-[#26251e] rounded-2xl p-8 border border-[#e6e5e0] flex flex-col justify-between aspect-[4/3] relative overflow-hidden group">
              <div className="space-y-3 relative z-10">
                <h3 className="text-xl font-bold tracking-tight text-[#26251e] font-serif font-georgia">Minerva Learn</h3>
                <p className="text-xs text-[#807d72] max-w-xs leading-relaxed">AI-native knowledge base and training hub built to scale local prospecting methods.</p>
              </div>
              <div className="flex gap-3 pt-6 relative z-10">
                <button onClick={() => router.push('/login')} className="bg-[#26251e] hover:bg-[#1a1a19] text-white rounded-full px-5 py-2 text-xs font-bold transition-colors cursor-pointer animate-none">Explore</button>
                <button onClick={() => router.push('/login')} className="bg-white hover:bg-neutral-100 text-[#26251e] border border-[#e6e5e0] rounded-full px-5 py-2 text-xs font-bold transition-colors cursor-pointer animate-none">Book an intro</button>
              </div>
            </div>
          </div>
        </main>

        <footer className="h-16 flex items-center justify-between px-8 border-t border-[#e6e5e0] text-[10px] text-[#807d72] font-semibold bg-white/40 z-10 relative">
          <div className="flex items-center gap-1.5"><MinervaIcon size={14} className="text-[#10b981]" /><span>Minerva OS</span></div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline hover:text-[#26251e] transition-colors">
              Conditions d'utilisation (Terms of Use)
            </Link>
            <Link href="/privacy" className="hover:underline hover:text-[#26251e] transition-colors">
              Politique de confidentialité (Privacy Policy)
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
