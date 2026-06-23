'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Sparkles, Copy, Check } from 'lucide-react';

export function AiSuggestionsCard() {
  const { aiSuggestions } = useReach();
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getChannelStyle = (channel: string) => {
    switch (channel) {
      case 'Email': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300';
      case 'DM': return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300';
      default: return 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300';
    }
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.ai_suggestions')}</CardTitle>
            <CardDescription className="text-xs">{t('today.ai_suggestions_desc')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiSuggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            {t('today.ai_suggestions_no_data')}
          </p>
        ) : (
          aiSuggestions.map((sug) => (
            <div key={sug.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-secondary/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">{sug.leadName}</span>
                <Badge variant="outline" className={`text-[8px] font-bold rounded px-1.5 py-0 ${getChannelStyle(sug.suggestedChannel)}`}>
                  {sug.suggestedChannel}
                </Badge>
              </div>
              <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                {sug.actionText}
              </p>
              <p className="text-[10px] text-muted-foreground italic bg-secondary/40 p-2 rounded">
                💡 {sug.reasoning}
              </p>
              
              <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/50">
                <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px]">
                  {t('today.ai_suggestions_prompt_available')}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(sug.id, sug.draftPrompt)}
                  className="h-7 px-2 text-[10px] font-semibold gap-1.5 text-primary hover:text-primary/80"
                >
                  {copiedId === sug.id ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">{t('today.ai_suggestions_copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{t('today.ai_suggestions_copy')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
export default AiSuggestionsCard;
