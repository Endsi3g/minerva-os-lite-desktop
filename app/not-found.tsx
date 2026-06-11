'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-x-hidden bg-background text-foreground font-sans">
      
      {/* Background soft highlight */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[35%] left-[50%] -translate-x-[50%] -translate-y-[50%] h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 text-center">
        
        {/* 404 number */}
        <div className="relative mb-2">
          <span className="text-8xl font-black tracking-widest bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            404
          </span>
        </div>

        {/* Warning label */}
        <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          Page Introuvable
        </span>

        {/* Short info */}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          La page que vous recherchez semble s&apos;être égarée dans le réseau ou n&apos;a jamais existé.
        </p>

        {/* Back Link Button */}
        <div className="mt-8">
          <Link href="/" passHref legacyBehavior>
            <Button 
              size="lg" 
              className="group inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground px-6 py-5 text-xs font-bold uppercase tracking-wider transition-all shadow-none border-0"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
