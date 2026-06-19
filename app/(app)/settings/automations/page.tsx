"use client";

import React, { useState, useEffect } from "react";
import { useReach } from "@/lib/reach-context";
import { Plus, Zap, Trash2, Edit2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultAutomations, Automation } from "@/lib/automations-engine";
import { createClient } from "@/lib/supabase/client";

export default function AutomationsSettingsPage() {
  const { activeWorkspace } = useReach();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAutomations() {
      if (!activeWorkspace) return;
      setLoading(true);
      const electronObj = typeof window !== "undefined" && (window as any).electron;
      if (electronObj) {
        try {
          const rows = await electronObj.dbAll("SELECT * FROM automations WHERE workspace_id = ?", [activeWorkspace.id]);
          if (rows && rows.length > 0) {
            setAutomations(rows.map((r: any) => ({
              id: r.id,
              workspaceId: r.workspace_id,
              name: r.name,
              triggerType: r.trigger_type,
              conditions: JSON.parse(r.conditions || "[]"),
              actions: JSON.parse(r.actions || "[]"),
              isActive: Boolean(r.is_active)
            })));
          } else {
            // Inject default
            const newAutos: Automation[] = [];
            for (const def of defaultAutomations) {
              const id = crypto.randomUUID();
              await electronObj.dbRun(
                `INSERT INTO automations (id, workspace_id, name, trigger_type, conditions, actions, is_active, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'pending_insert')`,
                [id, activeWorkspace.id, def.name, def.triggerType, JSON.stringify(def.conditions), JSON.stringify(def.actions), new Date().toISOString()]
              );
              newAutos.push({
                id,
                workspaceId: activeWorkspace.id,
                name: def.name,
                triggerType: def.triggerType as any,
                conditions: def.conditions as any,
                actions: def.actions as any,
                isActive: true
              });
            }
            if (electronObj.triggerSync) electronObj.triggerSync();
            setAutomations(newAutos);
          }
        } catch (e) {
          console.error("Local automations error", e);
        }
      } else {
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
      }
      setLoading(false);
    }
    loadAutomations();
  }, [activeWorkspace]);

  const toggleActive = async (id: string, current: boolean) => {
    const next = !current;
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: next } : a));
    const electronObj = typeof window !== "undefined" && (window as any).electron;
    if (electronObj) {
      await electronObj.dbRun(`UPDATE automations SET is_active = ?, sync_status = 'pending_update' WHERE id = ?`, [next ? 1 : 0, id]);
      if (electronObj.triggerSync) electronObj.triggerSync();
    } else {
      const supabase = createClient();
      await supabase.from('automations').update({ is_active: next }).eq('id', id);
    }
  };

  const deleteAutomation = async (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
    const electronObj = typeof window !== "undefined" && (window as any).electron;
    if (electronObj) {
      await electronObj.dbRun(`UPDATE automations SET sync_status = 'pending_delete' WHERE id = ?`, [id]);
      if (electronObj.triggerSync) electronObj.triggerSync();
    } else {
      const supabase = createClient();
      await supabase.from('automations').delete().eq('id', id);
    }
  };

  const renderTriggerIcon = (t: string) => {
    if (t === 'time_passed') return "⏳";
    if (t === 'intent_increased') return "🔥";
    if (t === 'lead_replied') return "💬";
    return "⚡";
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9]">
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
        
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#26251e] font-sans">Automations</h1>
            <p className="text-xs text-[#807d72] mt-1 max-w-xl">
              Configurez des règles "Si... Alors..." pour automatiser vos tâches et alertes en fonction du comportement des leads.
            </p>
          </div>
          <Button
            className="h-9 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl gap-2 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle Règle
          </Button>
        </div>

        {/* List automations */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#807d72] text-xs">
            Chargement des automations...
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center p-8 text-sm text-muted-foreground border rounded-lg bg-card">Aucune automation.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {automations.map(auto => (
              <div key={auto.id} className="border border-[#e5e5e0] bg-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-[#10b981]/40 transition-colors">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                    {renderTriggerIcon(auto.triggerType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#26251e]">{auto.name}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-slate-700">SI</span>
                        <div className="flex flex-wrap gap-1">
                          {auto.conditions.map((c, i) => (
                            <span key={i} className="bg-slate-100 px-2 py-0.5 rounded-md border text-[10px]">{String(c.field)} {c.operator.replace('_', ' ')} {String(c.value || 'vide')}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-emerald-700">ALORS</span>
                        <div className="flex flex-wrap gap-1">
                          {auto.actions.map((a, i) => (
                            <span key={i} className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 rounded-md border text-[10px]">{a.type.replace('_', ' ')}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button 
                    onClick={() => toggleActive(auto.id, auto.isActive)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                  >
                    {auto.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Actif</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Inactif</span>
                      </>
                    )}
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAutomation(auto.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600">
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
