'use client';
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageSearchResult {
  url: string;
  sourceUrl: string;
  domain: string;
  alt?: string;
}

interface AiImageSearchProps {
  results: ImageSearchResult[];
  query?: string;
  className?: string;
}

function DomainBadge({ domain }: { domain: string }) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  return (
    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faviconUrl}
        alt=""
        width={12}
        height={12}
        className="w-3 h-3 rounded-sm"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="text-white text-[10px] font-medium leading-none truncate max-w-[100px]">
        {domain}
      </span>
    </div>
  );
}

interface LightboxProps {
  results: ImageSearchResult[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ results, initialIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  const prev = () => setCurrent((c) => (c - 1 + results.length) % results.length);
  const next = () => setCurrent((c) => (c + 1) % results.length);

  const item = results[current];

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors p-1"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden bg-black w-full max-h-[70vh] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item?.url}
            alt={item?.alt ?? item?.domain}
            className="max-h-[70vh] max-w-full object-contain"
          />

          {/* Prev / Next */}
          {results.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        <div className="mt-3 flex items-center gap-2">
          <DomainBadge domain={item?.domain ?? ''} />
          <a
            href={item?.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white text-xs underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Voir la source
          </a>
        </div>

        {/* Dots */}
        {results.length > 1 && (
          <div className="flex items-center gap-1.5 mt-3">
            {results.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === current ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiImageSearch({ results, query, className }: AiImageSearchProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!results || results.length === 0) return null;

  // Layout: left column = first image (tall), right column = images 2 & 3 (stacked)
  const left = results[0];
  const rightTop = results[1];
  const rightBottom = results[2];

  return (
    <div className={cn('rounded-2xl overflow-hidden', className)}>
      {query && (
        <p className="text-xs text-[#7a7a76] mb-2 px-0.5">
          Recherche : <span className="font-medium text-[#26251e]">{query}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden">
        {/* Left — tall */}
        {left && (
          <button
            className="relative rounded-xl overflow-hidden bg-[#e5e5e0] aspect-[3/4] cursor-pointer group"
            onClick={() => setLightboxIndex(0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={left.url}
              alt={left.alt ?? left.domain}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-2 left-2">
              <DomainBadge domain={left.domain} />
            </div>
          </button>
        )}

        {/* Right — two stacked */}
        <div className="flex flex-col gap-1.5">
          {rightTop && (
            <button
              className="relative rounded-xl overflow-hidden bg-[#e5e5e0] aspect-[4/3] cursor-pointer group flex-1"
              onClick={() => setLightboxIndex(1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rightTop.url}
                alt={rightTop.alt ?? rightTop.domain}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2">
                <DomainBadge domain={rightTop.domain} />
              </div>
            </button>
          )}
          {rightBottom && (
            <button
              className="relative rounded-xl overflow-hidden bg-[#e5e5e0] aspect-[4/3] cursor-pointer group flex-1"
              onClick={() => setLightboxIndex(2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rightBottom.url}
                alt={rightBottom.alt ?? rightBottom.domain}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2">
                <DomainBadge domain={rightBottom.domain} />
              </div>
              {/* More overlay if there are additional images */}
              {results.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">+{results.length - 3}</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end mt-1.5">
        <span className="text-[10px] text-[#7a7a76]">Résultats du web</span>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          results={results}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export default AiImageSearch;
