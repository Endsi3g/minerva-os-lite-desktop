'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const DISMISSED_KEY = 'minerva_guest_upgrade_dismissed';

// Anonymous "try without an account" visitors (see lib/guest-mode.ts) need a
// way to keep what they built. supabase.auth.updateUser() converts the
// anonymous session to a permanent one in place — same user id, so every
// lead/task/workspace they created during the trial carries over untouched.
export function TodayGuestUpgradeBanner() {
  const { user } = useReach();
  const [dismissed, setDismissed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user?.is_anonymous || saved) return null;
  if (dismissed || (typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1')) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Entre un email valide et un mot de passe d'au moins 6 caractères.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (error) throw error;
      toast.success('Compte créé — tes leads et tâches sont sauvegardés.');
      setSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Impossible de créer le compte. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#26251e]">
            Tu es en mode essai — tes données seront perdues si tu ne crées pas de compte.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
          >
            Créer un compte
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-amber-700/60 hover:text-amber-900 transition-colors"
          aria-label="Masquer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpgrade} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <Input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            className="h-8 text-xs bg-white"
            required
          />
          <Input
            type="password"
            placeholder="Mot de passe (6+ caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={saving}
            className="h-8 text-xs bg-white"
            required
            minLength={6}
          />
          <Button type="submit" loading={saving} size="sm" className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shrink-0">
            Sauvegarder mon espace
          </Button>
        </form>
      )}
    </div>
  );
}
