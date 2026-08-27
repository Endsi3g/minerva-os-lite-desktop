'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Star,
  DollarSign,
  ArrowUpRight,
  Send,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';

export interface AILeadCardData {
  id?: string;
  businessName: string;
  niche?: string;
  city?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  dealAmount?: number;
  dealProbability?: number;
  temperature?: 'Hot' | 'Warm' | 'Cold';
  score?: number;
  summary?: string;
  tags?: string[];
}

interface AILeadCardProps {
  data: AILeadCardData;
  onContactClick?: (lead: AILeadCardData) => void;
  onBookMeeting?: (lead: AILeadCardData) => void;
}

export function AILeadCard({ data, onContactClick, onBookMeeting }: AILeadCardProps) {
  const leadUrl = data.id ? `/leads/${data.id}` : '#';

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden my-2.5 group">
      <CardContent className="p-3.5 space-y-2.5">
        {/* Header: Title & Badges */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={leadUrl}
                className="text-sm font-bold text-[#14171A] hover:text-[#059669] transition-colors leading-tight line-clamp-1"
              >
                {data.businessName}
              </Link>
              {data.id && (
                <Button asChild variant="ghost" size="icon" className="h-4 w-4 text-[#8A9098] hover:text-[#059669] p-0">
                  <Link href={leadUrl}>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#7a7a76]">
              {data.niche && <span className="font-semibold text-[#4B5158]">{data.niche}</span>}
              {data.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5 text-[#059669]" />
                  {data.city}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {data.temperature && (
              <Badge variant="secondary" className={cn("text-[9px] font-bold px-1.5 py-0 rounded", getTemperatureStyle(data.temperature))}>
                {getTemperatureLabel(data.temperature)}
              </Badge>
            )}
            {typeof data.score === 'number' && (
              <div className="h-5 px-1.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[9px] font-black flex items-center justify-center">
                {data.score}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {data.summary && (
          <p className="text-[11px] text-[#4B5158] leading-relaxed line-clamp-2 bg-neutral-50 p-2 rounded-lg border border-[#e5e5e0]/60">
            {data.summary}
          </p>
        )}

        {/* Contact details row */}
        <div className="flex items-center gap-3 text-[10px] text-[#7a7a76] flex-wrap">
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-1 hover:text-[#059669] font-mono">
              <Phone className="h-3 w-3 text-[#059669]" />
              {data.phone}
            </a>
          )}
          {data.website && (
            <a
              href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-[#059669] truncate max-w-[150px]"
            >
              <Globe className="h-3 w-3 text-[#059669]" />
              {data.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          )}
          {typeof data.rating === 'number' && data.rating > 0 && (
            <div className="flex items-center gap-1 text-amber-600 font-bold">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{data.rating.toFixed(1)}</span>
              {data.reviewsCount !== undefined && (
                <span className="text-[9px] text-[#8A9098] font-normal">({data.reviewsCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Deal Estimate & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0]/60">
          <div className="flex items-center gap-1 text-xs font-bold text-[#059669]">
            <DollarSign className="h-3.5 w-3.5" />
            <span>
              {(data.dealAmount || 1800).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
            </span>
            {data.dealProbability !== undefined && (
              <span className="text-[9px] text-[#8A9098] font-normal">({data.dealProbability}%)</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onBookMeeting && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBookMeeting(data)}
                className="h-6 text-[10px] font-semibold px-2 border-[#e5e5e0] hover:border-[#059669]"
              >
                <Calendar className="h-2.5 w-2.5 mr-1 text-[#059669]" />
                RDV
              </Button>
            )}
            <Button
              size="sm"
              asChild={!onContactClick}
              onClick={onContactClick ? () => onContactClick(data) : undefined}
              className="h-6 text-[10px] font-bold px-2.5 bg-[#059669] hover:bg-[#047857] text-white"
            >
              {onContactClick ? (
                <span>
                  <Send className="h-2.5 w-2.5 mr-1 inline" />
                  Contacter
                </span>
              ) : (
                <Link href={leadUrl}>
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Ouvrir
                </Link>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AILeadCard;
