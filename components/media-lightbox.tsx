'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaLightboxGridProps {
  images: string[];
  alt?: string;
  className?: string;
  thumbClassName?: string;
}

// Shared photo grid + fullscreen lightbox (prev/next, click-outside/Escape to close).
// Extracted so review photos, storefront photos, etc. don't each hand-roll their own
// overlay state — see field-gallery-root.tsx / messages-root.tsx for the ad-hoc versions
// this is meant to replace over time.
export function MediaLightboxGrid({ images, alt = 'Photo', className, thumbClassName }: MediaLightboxGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className={cn('grid grid-cols-3 gap-1.5', className)}>
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className={cn('aspect-square rounded-md overflow-hidden border border-[#e5e5e0] bg-[#f4f4f3] hover:opacity-90 transition-opacity', thumbClassName)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpenIndex(null);
            if (e.key === 'ArrowRight') setOpenIndex((i) => (i !== null ? (i + 1) % images.length : i));
            if (e.key === 'ArrowLeft') setOpenIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : i));
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : i)); }}
              className="absolute left-4 text-white/80 hover:text-white"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex]}
            alt={`${alt} ${openIndex + 1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i !== null ? (i + 1) % images.length : i)); }}
              className="absolute right-4 text-white/80 hover:text-white"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
