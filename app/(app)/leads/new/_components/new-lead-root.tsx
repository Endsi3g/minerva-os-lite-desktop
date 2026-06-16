'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { Lead } from '@/lib/mock-data';
import { ChevronLeft } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function NewLeadRoot() {
  const router = useRouter();
  const { addLead } = useReach();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch(getApiUrl('/api/team/members'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setTeamMembers(data);
        }
      } catch (e) {
        console.error('Error fetching team members:', e);
      }
    };
    fetchTeamMembers();
  }, []);

  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    contactEmail: '',
    niche: '',
    city: '',
    source: '',
    status: 'New' as Lead['status'],
    temperature: 'Warm' as Lead['temperature'],
    nextAction: '',
    nextActionDate: new Date().toISOString().split('T')[0],
    notes: '',
    website: '',
    mapsUrl: '',
    assignedTo: '__none__',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;

    const { assignedTo, website, mapsUrl, ...rest } = form;

    addLead({
      ...rest,
      ...(website ? { website } : {}),
      ...(mapsUrl ? { mapsUrl } : {}),
      ...(assignedTo && assignedTo !== '__none__' ? { assignedTo } : {}),
    });

    router.push('/leads');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/leads">
              <ChevronLeft className="h-4 w-4" />
              Retour aux leads
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nouveau prospect</h1>
          <p className="text-xs text-muted-foreground mt-1">Renseigne le profil commercial de ton lead. Il sera visible immédiatement.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-5">

          {/* Business name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nom du business *</label>
            <Input
              placeholder="Boulangerie L'Épi d'Or"
              value={form.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              required
            />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nom du contact</label>
              <Input
                placeholder="Jean Dupont"
                value={form.contactName}
                onChange={(e) => handleChange('contactName', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="jean.dupont@mail.com"
                value={form.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
              />
            </div>
          </div>

          {/* Niche + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Secteur / Niche</label>
              <Input
                placeholder="Boulangerie"
                value={form.niche}
                onChange={(e) => handleChange('niche', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ville</label>
              <Input
                placeholder="Montréal"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
          </div>

          {/* Temperature + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Température</label>
              <Select value={form.temperature} onValueChange={(val: Lead['temperature']) => handleChange('temperature', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">🔥 Chaud (Hot)</SelectItem>
                  <SelectItem value="Warm">☀️ Tiède (Warm)</SelectItem>
                  <SelectItem value="Cold">❄️ Froid (Cold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Statut du lead</label>
              <Select value={form.status} onValueChange={(val: Lead['status']) => handleChange('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">Nouveau (New)</SelectItem>
                  <SelectItem value="Contacted">Contacté (Contacted)</SelectItem>
                  <SelectItem value="Meeting Booked">RDV Fixé (Meeting Booked)</SelectItem>
                  <SelectItem value="Won">Gagné (Won)</SelectItem>
                  <SelectItem value="Lost">Perdu (Lost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Source</label>
            <Input
              placeholder="ex: Google Maps, Prospection physique"
              value={form.source}
              onChange={(e) => handleChange('source', e.target.value)}
            />
          </div>

          {/* Next action */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Action suivante</label>
            <Input
              placeholder="ex: Rappeler pour fixer un créneau"
              value={form.nextAction}
              onChange={(e) => handleChange('nextAction', e.target.value)}
            />
          </div>

          {/* Next action date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date de l&apos;action</label>
            <Input
              type="date"
              value={form.nextActionDate}
              onChange={(e) => handleChange('nextActionDate', e.target.value)}
            />
          </div>

          {/* Enrichment fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Site web</label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Lien Google Maps</label>
              <Input
                type="url"
                placeholder="https://maps.google.com/..."
                value={form.mapsUrl}
                onChange={(e) => handleChange('mapsUrl', e.target.value)}
              />
            </div>
          </div>

          {/* Assigner à */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigner à</label>
            <Select value={form.assignedTo} onValueChange={(val) => handleChange('assignedTo', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">Non assigné</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes de terrain / Contexte</label>
            <Textarea
              placeholder="ex: Pas de site mobile, gérant ouvert mais manque de temps."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.push('/leads')}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Enregistrer le prospect
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
