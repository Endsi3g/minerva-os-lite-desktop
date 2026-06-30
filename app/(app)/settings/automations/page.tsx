"use client";

import React, { useState, useEffect } from "react";
import { useReach } from "@/lib/reach-context";
import { useRouter } from "next/navigation";
import { Plus, Zap, Trash2, Edit2, CheckCircle2, XCircle, Hourglass, Flame, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultAutomations, Automation } from "@/lib/automations-engine";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export default function AutomationsSettingsPage() {
  const { activeWorkspace } = useReach();
  const router = useRouter();
  const { t } = useLanguage();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAutomations() {
      if (!activeWorkspace) return;
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from('automations').select('*').eq('workspace_id', activeWorkspace.id);
      if (data && data.length > 0) {
        setAutomations(data.map((r: any) => ({
          id: r.id,
          workspaceId: r.workspace_id,
          name: r.name,
          triggerType: r.trigger_type,
          conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
          actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
          isActive: r.is_active
        })));
      } else {
        // Inject defaults in supabase
        const newAutos = defaultAutomations.map(def => ({
          workspace_id: activeWorkspace.id,
          name: def.name,
          trigger_type: def.triggerType,
          conditions: def.conditions,
          actions: def.actions,
          is_active: true
        }));
        const { data: inserted } = await supabase.from('automations').insert(newAutos).select();
        if (inserted) {
          setAutomations(inserted.map((r: any) => ({
            id: r.id,
            workspaceId: r.workspace_id,
            name: r.name,
            triggerType: r.trigger_type,
            conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
            actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
            isActive: r.is_active
          })));
        }
      }
      setLoading(false);
    }
    loadAutomations();
  }, [activeWorkspace]);

  const toggleActive = async (id: string, current: boolean) => {
    const next = !current;
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: next } : a));
    const supabase = createClient();
    await supabase.from('automations').update({ is_active: next }).eq('id', id);
  };

  const deleteAutomation = async (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
    const supabase = createClient();
    await supabase.from('automations').delete().eq('id', id);
  };

  const renderTriggerIcon = (trig: string) => {
    if (trig === 'time_passed') return <Hourglass className="h-4 w-4 text-[#807d72]" />;
    if (trig === 'intent_increased') return <Flame className="h-4 w-4 text-[#059669]" />;
    if (trig === 'lead_replied') return <MessageCircle className="h-4 w-4 text-[#059669]" />;
    return <Zap className="h-4 w-4 text-[#807d72]" />;
  };

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      <div className="w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6 relative z-10">
        
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#26251e] font-sans">{t('automations.title')}</h1>
            <p className="text-xs text-[#807d72] mt-1 max-w-xl">
              {t('automations.subtitle')}
            </p>
          </div>
          <Button
            onClick={() => router.push('/settings/automations/new')}
            className="h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg gap-2 shrink-0 border-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('automations.new')}
          </Button>
        </div>

        {/* List automations */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#807d72] text-xs font-semibold">
            {t('automations.loading')}
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center p-12 text-xs text-[#807d72] font-semibold border border-[#e5e5e0] rounded-xl bg-white">
            {t('automations.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {automations.map(auto => (
              <div key={auto.id} className="border border-[#e5e5e0] bg-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#10b981]/40 transition-colors duration-200">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-8 w-8 rounded-lg bg-[#f4f4f3] flex items-center justify-center border border-[#e5e5e0] shrink-0">
                    {renderTriggerIcon(auto.triggerType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#26251e]">{auto.name}</h3>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
                        <span className="text-[10px] font-black text-[#26251e] tracking-wider uppercase">{t('automations.si')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {auto.conditions.map((c, i) => (
                            <span key={i} className="bg-[#f4f4f3] text-[#26251e] border border-[#e5e5e0] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                              {String(c.field)} {c.operator.replace('_', ' ')} {String(c.value || 'vide')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
                        <span className="text-[10px] font-black text-[#059669] tracking-wider uppercase">{t('automations.alors')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {auto.actions.map((a, i) => (
                            <span key={i} className="bg-emerald-50 text-[#059669] border border-emerald-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                              {a.type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button 
                    onClick={() => toggleActive(auto.id, auto.isActive)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent",
                      auto.isActive ? "border-[#059669]/20 text-[#059669] bg-[#059669]/5" : "border-[#e5e5e0] text-[#807d72]"
                    )}
                  >
                    {auto.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                        <span>{t('automations.active')}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-[#7a7a76]" />
                        <span>{t('automations.inactive')}</span>
                      </>
                    )}
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => router.push('/settings/automations/new')} className="h-8 w-8 text-[#807d72] hover:text-[#26251e] border border-transparent hover:border-[#e5e5e0] rounded-lg">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAutomation(auto.id)} className="h-8 w-8 text-[#807d72] hover:text-red-600 border border-transparent hover:border-red-100 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
