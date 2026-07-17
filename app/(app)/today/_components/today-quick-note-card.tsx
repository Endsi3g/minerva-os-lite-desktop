'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { FileText, CheckCircle2, Loader2, History } from 'lucide-react';
import { useAutosaveDraft } from '@/lib/use-autosave-draft';
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard';

const SAVE_DEBOUNCE_MS = 1200;

export function TodayQuickNoteCard() {
  const { quickNote, saveQuickNote } = useReach();
  const { t } = useLanguage();

  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSavedRef = useRef('');
  const hasSyncedInitialRef = useRef(false);

  // ReachContext hydrates quickNote asynchronously (SQLite/Supabase fetch) —
  // apply it once it arrives, but never after the user has started typing.
  useEffect(() => {
    if (hasSyncedInitialRef.current) return;
    if (quickNote) {
      hasSyncedInitialRef.current = true;
      setNoteContent(quickNote);
      lastSavedRef.current = quickNote;
    }
  }, [quickNote]);

  const isDirty = noteContent !== lastSavedRef.current;
  useUnsavedChangesGuard(isDirty);

  const { restoredDraft, dismissRestoredDraft, clearDraft } = useAutosaveDraft({
    key: 'today-quick-note',
    value: noteContent,
  });

  // Debounced autosave: persists to SQLite/Supabase a moment after the user
  // stops typing, no manual "Save" click required.
  useEffect(() => {
    if (!isDirty) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveQuickNote(noteContent);
      lastSavedRef.current = noteContent;
      clearDraft();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteContent, isDirty]);

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.quick_note')}</CardTitle>
            <CardDescription className="text-xs">{t('today.quick_note_desc')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {restoredDraft && restoredDraft !== noteContent && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-amber-800 min-w-0">
              <History className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Brouillon non enregistré trouvé.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setNoteContent(restoredDraft); dismissRestoredDraft(); }}
                className="h-6 px-2 rounded-md text-[10px] font-bold bg-amber-800 text-white hover:bg-amber-900 transition-colors"
              >
                Restaurer
              </button>
              <button
                type="button"
                onClick={() => clearDraft()}
                className="h-6 px-2 rounded-md text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                Ignorer
              </button>
            </div>
          </div>
        )}
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder={t('today.quick_note_placeholder')}
          className="text-xs min-h-[120px] resize-y leading-relaxed bg-[#fafaf8]"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#7a7a76] font-mono">
            {noteContent.length} {t('today.quick_note_characters')}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7a7a76] h-8">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('today.saving')}
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {t('today.saved')}
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
export default TodayQuickNoteCard;
