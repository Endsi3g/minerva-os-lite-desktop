'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { Lead } from '@/lib/mock-data';
import { ChevronLeft, Upload, X, Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

// Minimal select styled to match the app design
function AppSelect({
  value, onChange, children, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 text-xs font-medium bg-white border border-[#e5e5e0] rounded-lg text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] transition-colors appearance-none cursor-pointer"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a76' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
}

export default function NewLeadRoot() {
  const router = useRouter();
  const { addLead, activeWorkspace, updateWorkspace } = useReach();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [logoBase64, setLogoBase64] = useState('');
  const [customFormFields, setCustomFormFields] = useState<Record<string, string>>({});
  const [addingCustomField, setAddingCustomField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useUnsavedChangesGuard(isDirty);

  const handleCreateCustomField = () => {
    if (!newFieldName.trim() || !activeWorkspace) return;
    const current = activeWorkspace.custom_columns || [];
    if (current.includes(newFieldName.trim())) {
      toast.error('Ce champ existe déjà.');
      return;
    }
    const updated = [...current, newFieldName.trim()];
    updateWorkspace(activeWorkspace.id, { custom_columns: updated });
    setNewFieldName('');
    setAddingCustomField(false);
    toast.success('Champ personnalisé créé');
  };

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch(getApiUrl('/api/team/members'));
        if (res.ok) {
          const data = await res.json();
          const members = Array.isArray(data) ? data : (data?.members ?? []);
          setTeamMembers(members);
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
    phone: '',
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
    assignedTo: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoBase64(ev.target?.result as string); setIsDirty(true); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleCustomFieldChange = (colName: string, value: string) => {
    setCustomFormFields(prev => ({ ...prev, [colName]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;

    setIsSubmitting(true);
    const { assignedTo, website, mapsUrl, phone, ...rest } = form;
    try {
      await addLead({
        ...rest,
        ...(website ? { website } : {}),
        ...(mapsUrl ? { mapsUrl } : {}),
        ...(phone ? { phone } : {}),
        ...(assignedTo ? { assignedTo } : {}),
        ...(logoBase64 ? { imageUrl: logoBase64 } : {}),
        customFields: customFormFields,
      });
    } catch (err: any) {
      toast.error(`Échec de la création du prospect : ${err?.message || 'erreur inconnue'}`, { duration: 8000 });
      setIsSubmitting(false);
      return;
    }
    setIsDirty(false);
    router.push('/leads');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">

        {/* Back link */}
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-[#7a7a76] hover:text-[#26251e] w-fit">
          <Link href="/leads">
            <ChevronLeft className="h-4 w-4" />
            Retour aux leads
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">Nouveau prospect</h1>
          <p className="text-xs text-[#7a7a76] mt-1">Renseigne le profil commercial de ton lead.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e0] rounded-xl shadow-sm p-6 space-y-5">

          {/* Logo / Company image */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Logo / Photo de l&apos;entreprise</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => logoInputRef.current?.click()}
                className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0 ${
                  logoBase64 ? 'border-[#059669]/30' : 'border-[#e5e5e0] hover:border-[#059669]/40 hover:bg-[#f7fdf8]'
                }`}
              >
                {logoBase64 ? (
                  <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-[#c5c5c0]" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="h-8 px-3 text-xs font-semibold border border-[#e5e5e0] rounded-lg text-[#555552] hover:bg-[#f4f4f3] flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoBase64 ? 'Changer' : 'Téléverser'}
                </button>
                {logoBase64 && (
                  <button
                    type="button"
                    onClick={() => setLogoBase64('')}
                    className="h-8 px-3 text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          <div className="border-t border-[#e5e5e0]" />

          {/* Business name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du business <span className="text-red-400">*</span></label>
            <Input
              placeholder="Boulangerie L'Épi d'Or"
              value={form.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              required
              className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
            />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du contact</label>
              <Input
                placeholder="Jean Dupont"
                value={form.contactName}
                onChange={(e) => handleChange('contactName', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Email</label>
              <Input
                type="email"
                placeholder="jean.dupont@mail.com"
                value={form.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Téléphone</label>
            <Input
              type="tel"
              placeholder="+1 514 555-1234"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
            />
          </div>

          {/* Niche + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Secteur / Niche</label>
              <Input
                placeholder="Boulangerie"
                value={form.niche}
                onChange={(e) => handleChange('niche', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Ville</label>
              <Input
                placeholder="Montréal"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
          </div>

          {/* Temperature + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Température</label>
              <AppSelect value={form.temperature} onChange={(v) => handleChange('temperature', v)}>
                <option value="Hot">🔥 Chaud</option>
                <option value="Warm">☀️ Tiède</option>
                <option value="Cold">❄️ Froid</option>
              </AppSelect>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Statut</label>
              <AppSelect value={form.status} onChange={(v) => handleChange('status', v)}>
                <option value="New">Nouveau</option>
                <option value="Contacted">Contacté</option>
                <option value="Meeting Booked">RDV Fixé</option>
                <option value="Proposal Sent">Proposition envoyée</option>
                <option value="Negotiation">Négociation</option>
                <option value="Won">Gagné ✓</option>
                <option value="Lost">Perdu ✗</option>
              </AppSelect>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Source</label>
            <Input
              placeholder="ex: Google Maps, Prospection physique, LinkedIn"
              value={form.source}
              onChange={(e) => handleChange('source', e.target.value)}
              className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
            />
          </div>

          {/* Next action + date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Action suivante</label>
              <Input
                placeholder="ex: Rappeler pour fixer un créneau"
                value={form.nextAction}
                onChange={(e) => handleChange('nextAction', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Date de l&apos;action</label>
              <Input
                type="date"
                value={form.nextActionDate}
                onChange={(e) => handleChange('nextActionDate', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
          </div>

          {/* Website + Maps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Site web</label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Lien Google Maps</label>
              <Input
                type="url"
                placeholder="https://maps.google.com/..."
                value={form.mapsUrl}
                onChange={(e) => handleChange('mapsUrl', e.target.value)}
                className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
              />
            </div>
          </div>

          {/* Assign to */}
          {teamMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Assigner à</label>
              <AppSelect value={form.assignedTo} onChange={(v) => handleChange('assignedTo', v)} placeholder="— Non assigné —">
                <option value="">— Non assigné —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </AppSelect>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Notes de terrain / Contexte</label>
            <Textarea
              placeholder="ex: Pas de site mobile, gérant ouvert mais manque de temps."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669] resize-none"
            />
          </div>

          {/* Champs Personnalisés */}
          {(activeWorkspace?.custom_columns && activeWorkspace.custom_columns.length > 0) || addingCustomField ? (
            <div className="space-y-4 pt-2 border-t border-[#e5e5e0]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Champs personnalisés</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeWorkspace?.custom_columns?.map((colName) => (
                  <div key={colName} className="space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{colName}</label>
                    <Input
                      placeholder={`Valeur pour ${colName}`}
                      value={customFormFields[colName] || ''}
                      onChange={(e) => handleCustomFieldChange(colName, e.target.value)}
                      className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669] focus:border-[#059669]"
                    />
                  </div>
                ))}
              </div>

              {addingCustomField ? (
                <div className="flex gap-2 items-center bg-[#fafaf8] border border-[#e5e5e0] p-3 rounded-lg max-w-md animate-in slide-in-from-top-1 duration-150">
                  <Input
                    placeholder="Nom du nouveau champ..."
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="h-8 text-xs border-[#e5e5e0] focus:ring-[#059669]"
                    autoFocus
                  />
                  <Button type="button" onClick={handleCreateCustomField} size="sm" className="bg-[#059669] hover:bg-[#047857] text-white text-xs h-8">
                    Créer
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setAddingCustomField(false); setNewFieldName(''); }} size="sm" className="h-8 text-xs hover:bg-[#f4f4f3]">
                    Annuler
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCustomField(true)}
                  className="flex items-center gap-1.5 text-xs text-[#059669] font-bold hover:underline py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer un autre champ personnalisé
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-[#e5e5e0]">
              <button
                type="button"
                onClick={() => setAddingCustomField(true)}
                className="flex items-center gap-1.5 text-xs text-[#059669] font-bold hover:underline py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un champ personnalisé
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e5e5e0]">
            <button
              type="button"
              onClick={() => router.push('/leads')}
              className="px-4 py-2 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              Annuler
            </button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="px-5 py-2 h-auto text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors"
            >
              Enregistrer le prospect
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
