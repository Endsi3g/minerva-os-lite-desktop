'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';

interface NotificationsData {
  reminderOverdue: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  digestTime: string;
}

interface SettingsNotificationsSectionProps {
  data: NotificationsData;
  onChange: (updates: Partial<NotificationsData>) => void;
  isSaving: boolean;
}

// Inline custom Switch component
function LocalSwitch({ checked, onCheckedChange, ariaLabel }: { checked: boolean; onCheckedChange: (c: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow-xs ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function SettingsNotificationsSection({ data, onChange, isSaving }: SettingsNotificationsSectionProps) {
  return (
    <SettingsSectionWrapper
      title="Notifications & Rappels"
      description="Gère la réception des alertes de relances de tes prospects et tes résumés d&apos;activité."
      isSaving={isSaving}
    >
      {/* Channels switches */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Alertes de prospection</h3>
          
          <div className="space-y-4 pt-1">
            {/* Overdue alerts */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Rappels d&apos;actions en retard</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Reçois une alerte de rappel pour chaque action commerciale (relance, appel) non résolue à l&apos;échéance.
                </p>
              </div>
              <LocalSwitch 
                checked={data.reminderOverdue} 
                onCheckedChange={(checked) => onChange({ reminderOverdue: checked })}
                ariaLabel="Basculer les rappels d'actions en retard"
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* Daily Summary */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Résumé quotidien</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Reçois un résumé tous les soirs récapitulant les opportunités chaudes et les tâches programmées pour le lendemain.
                </p>
              </div>
              <LocalSwitch 
                checked={data.dailyDigest} 
                onCheckedChange={(checked) => onChange({ dailyDigest: checked })}
                ariaLabel="Basculer le résumé quotidien"
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* Weekly report */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Rapport de performance hebdomadaire</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Reçois un bilan de performance de tes taux d&apos;engagement et des opportunités gagnées la semaine passée.
                </p>
              </div>
              <LocalSwitch 
                checked={data.weeklyReport} 
                onCheckedChange={(checked) => onChange({ weeklyReport: checked })}
                ariaLabel="Basculer le rapport de performance hebdomadaire"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing select box */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Planification horaire</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Définis l&apos;heure à laquelle tu souhaites recevoir tes rappels quotidiens (idéal en fin de journée ou début de soirée).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Heure d&apos;envoi préférée</label>
              <Select 
                value={data.digestTime} 
                onValueChange={(val) => onChange({ digestTime: val })}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00" className="text-xs">08:00 (Début de journée)</SelectItem>
                  <SelectItem value="12:00" className="text-xs">12:00 (Midi)</SelectItem>
                  <SelectItem value="18:00" className="text-xs">18:00 (Fin de service)</SelectItem>
                  <SelectItem value="20:00" className="text-xs">20:00 (Soirée)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsNotificationsSection;
