'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, HelpCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestionItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'single_choice' | 'multi_choice' | 'freeform';
  options?: Array<{ id: string; label: string; hint?: string; score?: number }>;
  required?: boolean;
}

export interface QuestionnaireData {
  title: string;
  description?: string;
  category?: string;
  questions: QuestionItem[];
}

interface AIQuestionnaireProps {
  data: QuestionnaireData;
  onSubmit?: (answers: Record<string, any>) => void;
}

export function AIQuestionnaire({ data, onSubmit }: AIQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const questions = data.questions || [];
  const activeQuestion = questions[currentStep];

  const handleSingleSelect = (val: string) => {
    if (!activeQuestion) return;
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: val }));
  };

  const handleMultiToggle = (optId: string) => {
    if (!activeQuestion) return;
    const current = (answers[activeQuestion.id] as string[]) || [];
    const next = current.includes(optId)
      ? current.filter((x) => x !== optId)
      : [...current, optId];
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: next }));
  };

  const handleFreeformChange = (val: string) => {
    if (!activeQuestion) return;
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: val }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      if (onSubmit) onSubmit(answers);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  if (!questions.length) return null;

  return (
    <Card className="border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/20 shadow-sm rounded-xl overflow-hidden my-3">
      <CardHeader className="pb-3 border-b border-[#e5e5e0]/60 bg-white/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[#059669]/10 flex items-center justify-center text-[#059669]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-xs font-bold text-[#14171A] font-heading font-sans uppercase tracking-wider">
              {data.title || 'Questionnaire de Qualification'}
            </CardTitle>
          </div>
          {data.category && (
            <Badge variant="secondary" className="text-[9px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200/50">
              {data.category}
            </Badge>
          )}
        </div>
        {data.description && <p className="text-[11px] text-[#7a7a76] mt-1">{data.description}</p>}

        {/* Progress step bar */}
        {!isCompleted && (
          <div className="flex items-center gap-1.5 mt-2">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  idx === currentStep
                    ? 'bg-[#059669]'
                    : idx < currentStep
                    ? 'bg-[#059669]/40'
                    : 'bg-[#e5e5e0]'
                )}
              />
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {isCompleted ? (
          <div className="text-center py-4 space-y-2">
            <div className="h-10 w-10 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-[#14171A]">Qualification enregistrée avec succès !</h4>
            <p className="text-xs text-[#7a7a76]">
              {Object.keys(answers).length} réponses collectées et intégrées au profil lead.
            </p>
          </div>
        ) : activeQuestion ? (
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono text-[#059669] font-bold">
                Étape {currentStep + 1} / {questions.length}
              </span>
              <h4 className="text-xs font-bold text-[#14171A] mt-0.5">{activeQuestion.title}</h4>
              {activeQuestion.subtitle && (
                <p className="text-[11px] text-[#7a7a76] mt-0.5">{activeQuestion.subtitle}</p>
              )}
            </div>

            {/* Single choice options */}
            {activeQuestion.type === 'single_choice' && activeQuestion.options && (
              <div className="space-y-1.5">
                {activeQuestion.options.map((opt) => {
                  const isSelected = answers[activeQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSingleSelect(opt.id)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer',
                        isSelected
                          ? 'border-[#059669] bg-emerald-50/50 font-bold text-[#059669]'
                          : 'border-[#e5e5e0] bg-white hover:border-[#059669]/40 text-[#26251e]'
                      )}
                    >
                      <div>
                        <div>{opt.label}</div>
                        {opt.hint && <div className="text-[10px] text-[#7a7a76] font-normal">{opt.hint}</div>}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#059669] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi choice options */}
            {activeQuestion.type === 'multi_choice' && activeQuestion.options && (
              <div className="space-y-1.5">
                {activeQuestion.options.map((opt) => {
                  const currentSelected = (answers[activeQuestion.id] as string[]) || [];
                  const isSelected = currentSelected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleMultiToggle(opt.id)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer',
                        isSelected
                          ? 'border-[#059669] bg-emerald-50/50 font-bold text-[#059669]'
                          : 'border-[#e5e5e0] bg-white hover:border-[#059669]/40 text-[#26251e]'
                      )}
                    >
                      <div>
                        <div>{opt.label}</div>
                        {opt.hint && <div className="text-[10px] text-[#7a7a76] font-normal">{opt.hint}</div>}
                      </div>
                      <Checkbox checked={isSelected} className="data-[state=checked]:bg-[#059669]" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Freeform input */}
            {activeQuestion.type === 'freeform' && (
              <Input
                placeholder="Tapez votre réponse ici..."
                value={answers[activeQuestion.id] || ''}
                onChange={(e) => handleFreeformChange(e.target.value)}
                className="text-xs h-9 bg-white"
                autoFocus
              />
            )}
          </div>
        ) : null}
      </CardContent>

      {!isCompleted && (
        <CardFooter className="p-3 border-t border-[#e5e5e0]/60 bg-neutral-50/50 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-xs h-7 text-[#7a7a76] hover:text-[#14171A]"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Précédent
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className="text-xs h-7 bg-[#059669] hover:bg-[#047857] text-white font-bold"
          >
            {currentStep < questions.length - 1 ? (
              <>
                Suivant
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </>
            ) : (
              <>
                Valider
                <Check className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default AIQuestionnaire;
