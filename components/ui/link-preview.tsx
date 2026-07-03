'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain: string;
  url: string;
}

interface LinkPreviewProps {
  url: string;
  children: React.ReactNode;
  className?: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function PreviewCard({
  data,
  loading,
  position,
}: {
  data: LinkPreviewData | null;
  loading: boolean;
  position: 'above' | 'below';
}) {
  const domain = data?.domain ?? '';
  const faviconUrl =
    data?.favicon ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <div
      className={cn(
        'absolute z-50 w-[320px] bg-white rounded-xl shadow-xl border border-[#e5e5e0] overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
        'left-0'
      )}
    >
      {/* OG image */}
      {data?.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={data.image}
          alt={data.title ?? domain}
          className="w-full h-32 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      <div className="px-3 py-2.5">
        {/* Domain row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl}
            alt=""
            width={14}
            height={14}
            className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-[11px] text-[#7a7a76] font-medium truncate">{domain}</span>
        </div>

        {/* Loading state */}
        {loading && !data && (
          <div className="space-y-1.5 pb-1">
            <div className="h-3 bg-[#e5e5e0] rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-[#e5e5e0] rounded animate-pulse w-full" />
            <div className="h-2.5 bg-[#e5e5e0] rounded animate-pulse w-2/3" />
          </div>
        )}

        {/* Title */}
        {data?.title && (
          <p className="text-sm font-semibold text-[#26251e] leading-snug line-clamp-2 mb-0.5">
            {data.title}
          </p>
        )}

        {/* Description */}
        {data?.description && (
          <p className="text-xs text-[#7a7a76] leading-relaxed line-clamp-2">
            {data.description}
          </p>
        )}

        {/* Footer link */}
        <a
          href={data?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-2 text-[11px] text-[#059669] hover:text-[#047857] font-medium transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate max-w-[260px]">{data?.url ?? ''}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70 group-hover:opacity-100" />
        </a>
      </div>
    </div>
  );
}

export function LinkPreview({ url, children, className }: LinkPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const containerRef = useRef<HTMLSpanElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const domain = extractDomain(url);

  const fetchPreview = useCallback(async () => {
    if (fetchedRef.current === url) return;
    fetchedRef.current = url;
    setLoading(true);

    // Show minimal stub immediately
    setData({ domain, url });

    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const json = await res.json();
        setData({ domain, url, ...json });
      }
    } catch {
      // Keep the stub
    } finally {
      setLoading(false);
    }
  }, [url, domain]);

  function handleMouseEnter() {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Compute position based on element proximity to viewport top
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition(rect.top > 160 ? 'above' : 'below');
    }

    setVisible(true);
    fetchPreview();
  }

  function handleMouseLeave() {
    hideTimeoutRef.current = setTimeout(() => setVisible(false), 150);
  }

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <span
      ref={containerRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <PreviewCard data={data} loading={loading} position={position} />
      )}
    </span>
  );
}

/** Static version — pass data directly, no fetch */
export function LinkPreviewSimple({
  data,
  children,
  className,
}: {
  data: LinkPreviewData;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<'above' | 'below'>('above');

  function handleMouseEnter() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition(rect.top > 160 ? 'above' : 'below');
    }
    setVisible(true);
  }

  return (
    <span
      ref={containerRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <PreviewCard data={data} loading={false} position={position} />}
    </span>
  );
}

export default LinkPreview;
