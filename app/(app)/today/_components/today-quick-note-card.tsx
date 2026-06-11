'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { FileText, Save, CheckCircle2 } from 'lucide-react';

export function TodayQuickNoteCard() {
  const { quickNote, saveQuickNote } = useReach();
  
  // Initialize state directly from localStorage to avoid hydration/useEffect setState warnings
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');  // Load initial value on mount deferred
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('minerva_quick_note') || quickNote || '';
      setNoteContent(stored);
    }, 0);
    return () => clearTimeout(timer);
  }, [quickNote]);
  const handleSave = () => {
    setSaveStatus('saving');
    saveQuickNote(noteContent);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 600);
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Notes Rapides</CardTitle>
            <CardDescription className="text-xs">Journal, idées volantes ou rappels temporaires.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Rédige tes notes ici..."
          className="text-xs min-h-[120px] resize-y leading-relaxed bg-background"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">
            {noteContent.length} caractères
          </span>
          <Button 
            size="sm" 
            onClick={handleSave} 
            className="h-8 gap-1.5 px-3 bg-primary hover:bg-primary/90 text-xs font-semibold"
          >
            {saveStatus === 'saving' ? (
              <span>Sauvegarde...</span>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enregistré</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Enregistrer</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default TodayQuickNoteCard;
