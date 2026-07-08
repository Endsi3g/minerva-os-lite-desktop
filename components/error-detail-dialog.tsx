'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import type { AppNotification } from '@/lib/reach-context';

interface Props {
  notification: AppNotification | null;
  onClose: () => void;
}

// Full-screen-ish detail view for a single "app_error"/"ai_failure"/"ai_rate_limit"
// notification — the bell dropdown and the /notifications list only have room for a
// truncated title/body, so clicking one opens this instead of (or in addition to)
// navigating, showing the complete message, stack trace, and structured context that
// error_detail carries.
export function ErrorDetailDialog({ notification, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const detail = notification?.errorDetail;

  const handleCopy = async () => {
    if (!notification) return;
    const parts = [
      `Titre: ${notification.title}`,
      `Message: ${detail?.message || notification.body}`,
      detail?.source ? `Source: ${detail.source}` : null,
      detail?.timestamp ? `Horodatage: ${detail.timestamp}` : `Horodatage: ${notification.createdAt}`,
      detail?.stack ? `\nStack:\n${detail.stack}` : null,
      detail?.context ? `\nContexte:\n${JSON.stringify(detail.context, null, 2)}` : null,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(parts);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — non-critical */ }
  };

  return (
    <Dialog open={!!notification} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-4 font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#26251e]">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            {notification?.title || 'Détail de l\'erreur'}
          </DialogTitle>
          <DialogDescription>
            {detail?.source ? `Source : ${detail.source}` : null}
            {detail?.timestamp || notification?.createdAt
              ? ` · ${new Date(detail?.timestamp || notification?.createdAt || '').toLocaleString('fr-FR')}`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 text-left">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a7a76] mb-1">Message</p>
            <p className="text-xs text-[#26251e] whitespace-pre-wrap break-words bg-[#f4f4f3] rounded-lg p-3">
              {detail?.message || notification?.body}
            </p>
          </div>

          {detail?.context ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a7a76] mb-1">Contexte</p>
              <pre className="text-[10px] text-[#26251e] whitespace-pre-wrap break-words bg-[#f4f4f3] rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(detail.context, null, 2)}
              </pre>
            </div>
          ) : null}

          {detail?.stack ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a7a76] mb-1">Stack trace</p>
              <pre className="text-[10px] text-[#26251e] whitespace-pre-wrap break-words bg-[#f4f4f3] rounded-lg p-3 overflow-x-auto font-mono">
                {detail.stack}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copié' : 'Copier le détail'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
