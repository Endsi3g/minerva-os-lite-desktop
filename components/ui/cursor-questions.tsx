'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi';
  options: QuestionOption[];
  allowOther?: boolean;
}

interface CursorQuestionsProps {
  questions: Question[];
  onComplete: (answers: Record<string, string | string[]>) => void;
  onSkip?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

export function CursorQuestions({
  questions,
  onComplete,
  onSkip,
  onDismiss,
  className,
}: CursorQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [otherValue, setOtherValue] = useState('');
  const [showOther, setShowOther] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const current = questions[currentIndex];
  const total = questions.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const currentAnswer = answers[current?.id ?? ''];
  const selectedValues: string[] = Array.isArray(currentAnswer)
    ? currentAnswer
    : currentAnswer
    ? [currentAnswer]
    : [];

  function navigate(dir: 'forward' | 'backward') {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      if (dir === 'forward') {
        if (isLast) {
          onComplete(answers);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      } else {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
      setShowOther(false);
      setOtherValue('');
      setAnimating(false);
    }, 180);
  }

  function toggleOption(value: string) {
    if (!current) return;
    if (current.type === 'single') {
      setAnswers((prev) => ({ ...prev, [current.id]: value }));
    } else {
      setAnswers((prev) => {
        const existing = (prev[current.id] as string[] | undefined) ?? [];
        const next = existing.includes(value)
          ? existing.filter((v) => v !== value)
          : [...existing, value];
        return { ...prev, [current.id]: next };
      });
    }
  }

  function commitOther() {
    if (!current || !otherValue.trim()) return;
    toggleOption(otherValue.trim());
    setShowOther(false);
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!current) return;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        onSkip?.();
        return;
      }
      if (key === 'enter') {
        if (showOther) {
          commitOther();
        } else {
          navigate('forward');
        }
        return;
      }
      if (key === 'arrowleft' && !isFirst) {
        navigate('backward');
        return;
      }
      if (key === 'arrowright') {
        navigate('forward');
        return;
      }

      // Letter keys for option selection
      const idx = OPTION_KEYS.indexOf(key);
      if (idx !== -1) {
        if (idx < current.options.length) {
          toggleOption(current.options[idx].value);
        } else if (current.allowOther && idx === current.options.length) {
          setShowOther(true);
          setTimeout(() => otherInputRef.current?.focus(), 50);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, isFirst, showOther, otherValue, answers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!current) return null;

  return (
    <div
      className={cn(
        'w-full max-w-[500px] bg-white rounded-2xl shadow-xl border border-[#e5e5e0] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e0]">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded-md hover:bg-[#fafaf8] text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <ChevronUp
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              collapsed ? 'rotate-180' : ''
            )}
          />
        </button>

        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#059669]" />
          <span className="text-sm font-semibold text-[#26251e]">Questions</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('backward')}
            disabled={isFirst}
            className="p-1 rounded-md hover:bg-[#fafaf8] text-[#7a7a76] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#7a7a76] font-medium min-w-[40px] text-center">
            {currentIndex + 1} / {total}
          </span>
          <button
            onClick={() => navigate('forward')}
            className="p-1 rounded-md hover:bg-[#fafaf8] text-[#7a7a76] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          className={cn(
            'transition-all duration-180',
            animating
              ? direction === 'forward'
                ? 'opacity-0 translate-x-2'
                : 'opacity-0 -translate-x-2'
              : 'opacity-100 translate-x-0'
          )}
        >
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-semibold text-[#26251e] leading-snug">
              <span className="text-[#7a7a76] font-normal mr-1">{currentIndex + 1}.</span>
              {current.text}
            </p>
            {current.type === 'multi' && (
              <p className="text-xs text-[#7a7a76] mt-0.5">Sélection multiple possible</p>
            )}
          </div>

          {/* Options */}
          <div className="px-4 pb-3 flex flex-col gap-1.5">
            {current.options.map((opt, idx) => {
              const key = OPTION_KEYS[idx]?.toUpperCase() ?? '';
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-xl border text-left transition-all text-sm',
                    isSelected
                      ? 'border-[#26251e] bg-[#26251e] text-white'
                      : 'border-[#e5e5e0] bg-[#fafaf8] text-[#26251e] hover:border-[#059669] hover:bg-[#f0faf6]'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded-md border text-xs font-bold flex items-center justify-center transition-colors',
                      isSelected
                        ? 'border-white/40 bg-white/20 text-white'
                        : 'border-[#e5e5e0] bg-white text-[#7a7a76]'
                    )}
                  >
                    {key}
                  </span>
                  <span className="flex-1 leading-snug">{opt.label}</span>
                </button>
              );
            })}

            {/* Other option */}
            {current.allowOther && (
              <>
                {!showOther ? (
                  <button
                    onClick={() => {
                      setShowOther(true);
                      setTimeout(() => otherInputRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] text-left text-sm text-[#7a7a76] hover:border-[#059669] hover:text-[#26251e] transition-all"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-md border border-[#e5e5e0] bg-white text-xs font-bold flex items-center justify-center text-[#7a7a76]">
                      {OPTION_KEYS[current.options.length]?.toUpperCase()}
                    </span>
                    <span>Autre…</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#059669] bg-[#f0faf6]">
                    <input
                      ref={otherInputRef}
                      value={otherValue}
                      onChange={(e) => setOtherValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          commitOther();
                        }
                        if (e.key === 'Escape') {
                          setShowOther(false);
                        }
                      }}
                      placeholder="Précisez…"
                      className="flex-1 bg-transparent text-sm text-[#26251e] outline-none placeholder:text-[#7a7a76]"
                    />
                    <button
                      onClick={commitOther}
                      className="text-xs font-medium text-[#059669] hover:text-[#047857] transition-colors"
                    >
                      OK
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e5e5e0]">
            <button
              onClick={onSkip}
              className="text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              Ignorer · Esc
            </button>
            <button
              onClick={() => navigate('forward')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-medium transition-colors"
            >
              <span>{isLast ? 'Terminer' : 'Continuer'}</span>
              <span className="opacity-60">↵</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CursorQuestions;
