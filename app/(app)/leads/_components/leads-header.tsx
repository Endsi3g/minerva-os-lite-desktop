'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { Plus, Upload, X, FileText, Check, AlertCircle, Users2, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

// Map CSV column names → Lead field names
const COL_MAP: Record<string, keyof typeof FIELD_DEFAULTS> = {
  businessname: 'businessName', business_name: 'businessName', nom: 'businessName', name: 'businessName',
  contactname: 'contactName', contact_name: 'contactName', contact: 'contactName',
  email: 'contactEmail', contactemail: 'contactEmail', contact_email: 'contactEmail',
  niche: 'niche', secteur: 'niche', category: 'niche',
  city: 'city', ville: 'city',
  source: 'source',
  status: 'status', statut: 'status',
  notes: 'notes', note: 'notes',
  website: 'website', site: 'website', url: 'website',
  phone: 'phone', telephone: 'phone', tel: 'phone',
};

const FIELD_DEFAULTS = {
  businessName: '', contactName: '', contactEmail: '', niche: '', city: '',
  source: 'CSV Import', status: 'New' as Lead['status'], notes: '', website: '', phone: '',
};

function rowToLead(row: Record<string, string>): typeof FIELD_DEFAULTS {
  const lead = { ...FIELD_DEFAULTS };
  for (const [col, val] of Object.entries(row)) {
    const field = COL_MAP[col.replace(/\s+/g, '').toLowerCase()];
    if (field) (lead as Record<string, string>)[field] = val;
  }
  return lead;
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Google Contacts import types ─────────────────────────────────────────────

interface GoogleContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadsHeader() {
  const { leads, addLead } = useReach();

  // Google Contacts sheet state
  const [showContactsSheet, setShowContactsSheet] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsConnected, setContactsConnected] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactsImporting, setContactsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const res = await fetch(getApiUrl('/api/google/contacts/list'));
      const data = await res.json();
      if (data.connected === false) {
        setContactsConnected(false);
      } else {
        setContactsConnected(true);
        setContacts(data.contacts || []);
        if (data.error) setContactsError(data.error);
      }
    } catch (err: any) {
      setContactsError(err.message || 'Erreur réseau');
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const handleOpenContacts = () => {
    setShowContactsSheet(true);
    setSelectedContacts(new Set());
    setImportedCount(0);
    fetchContacts();
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleImportContacts = async () => {
    const toImport = contacts.filter((c) => selectedContacts.has(c.id));
    if (!toImport.length) return;
    setContactsImporting(true);
    let count = 0;
    for (const contact of toImport) {
      if (!contact.name && !contact.email) continue;
      await addLead({
        businessName: contact.company || contact.name || contact.email,
        contactName: contact.name || '',
        contactEmail: contact.email || undefined,
        niche: '',
        city: '',
        source: 'Google Contacts',
        status: 'New' as Lead['status'],
        temperature: 'Warm',
        nextAction: '',
        nextActionDate: new Date().toISOString().split('T')[0],
        phone: contact.phone || undefined,
      });
      count++;
    }
    setImportedCount(count);
    setContactsImporting(false);
    setTimeout(() => {
      setShowContactsSheet(false);
      setContacts([]);
      setSelectedContacts(new Set());
      setImportedCount(0);
    }, 1800);
  };

  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ReturnType<typeof rowToLead>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Seuls les fichiers .csv sont acceptés.');
      return;
    }
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (!rows.length) {
        setParseError('Aucune donnée valide trouvée dans le fichier.');
        return;
      }
      setParsedRows(rows.map(rowToLead));
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleImport = useCallback(async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    for (const row of parsedRows) {
      if (!row.businessName) continue;
      await addLead({
        businessName: row.businessName,
        contactName: row.contactName || '',
        contactEmail: row.contactEmail || undefined,
        niche: row.niche || '',
        city: row.city || '',
        source: row.source || 'CSV Import',
        status: (['New','Contacted','Meeting Booked','Proposal Sent','Negotiation','Won','Lost'].includes(row.status) ? row.status : 'New') as Lead['status'],
        temperature: 'Warm',
        nextAction: '',
        nextActionDate: new Date().toISOString().split('T')[0],
        notes: row.notes || undefined,
        website: row.website || undefined,
      });
    }
    setImporting(false);
    setImportDone(true);
    setTimeout(() => {
      setShowModal(false);
      setImportDone(false);
      setParsedRows([]);
      setFileName('');
    }, 1800);
  }, [parsedRows, addLead]);

  const closeModal = () => {
    setShowModal(false);
    setParsedRows([]);
    setFileName('');
    setParseError('');
    setImportDone(false);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-[#e5e5e0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">Leads</h1>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            Portefeuille des opportunités de prospection locale ({leads.length} prospect{leads.length !== 1 ? 's' : ''} au total).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#e5e5e0] text-[#26251e] hover:bg-[#f4f4f3]"
            onClick={handleOpenContacts}
          >
            <Users2 className="h-3.5 w-3.5 text-[#059669]" />
            Google Contacts
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowModal(true)}>
            <Upload className="h-3.5 w-3.5" />
            Importer CSV
          </Button>
          <Button asChild size="sm" className="gap-2 bg-[#059669] hover:bg-[#059669]/90">
            <Link href="/leads/new">
              <Plus className="h-3.5 w-3.5" />
              Nouveau lead
            </Link>
          </Button>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[560px] max-w-[95vw] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#26251e]">Importer des leads depuis un CSV</h3>
                <p className="text-xs text-[#7a7a76] mt-0.5">
                  Colonnes reconnues : businessName, contactName, email, niche, city, source, status, notes, website, phone
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Drop zone */}
              {!parsedRows.length && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    dragOver ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#059669]/50 hover:bg-[#f7fdf8]'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto mb-3 text-[#7a7a76]" />
                  <p className="text-xs font-semibold text-[#26251e]">Glissez un fichier CSV ici</p>
                  <p className="text-[10px] text-[#7a7a76] mt-1">ou cliquez pour parcourir</p>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Error */}
              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#059669]" />
                      <span className="text-xs font-semibold text-[#26251e]">{fileName}</span>
                    </div>
                    <span className="text-[10px] text-[#7a7a76]">{parsedRows.length} lead{parsedRows.length !== 1 ? 's' : ''} détecté{parsedRows.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="border border-[#e5e5e0] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#f7f7f4] sticky top-0">
                          <tr>
                            {['Nom business', 'Contact', 'Email', 'Niche', 'Ville', 'Statut'].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-bold text-[#7a7a76] uppercase tracking-wide text-[9px] whitespace-nowrap border-b border-[#e5e5e0]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((row, i) => (
                            <tr key={i} className="border-b border-[#f0f0ec] last:border-0 hover:bg-[#fafaf8]">
                              <td className="px-3 py-2 font-semibold text-[#26251e] max-w-[140px] truncate">{row.businessName || '—'}</td>
                              <td className="px-3 py-2 text-[#555552] max-w-[100px] truncate">{row.contactName || '—'}</td>
                              <td className="px-3 py-2 text-[#555552] max-w-[140px] truncate">{row.contactEmail || '—'}</td>
                              <td className="px-3 py-2 text-[#7a7a76] max-w-[100px] truncate">{row.niche || '—'}</td>
                              <td className="px-3 py-2 text-[#7a7a76]">{row.city || '—'}</td>
                              <td className="px-3 py-2">
                                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-[#f7f7f4] text-[#7a7a76] border-[#e5e5e0]">
                                  {row.status || 'New'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    onClick={() => { setParsedRows([]); setFileName(''); }}
                    className="text-[10px] text-[#7a7a76] hover:text-[#26251e] underline transition-colors"
                  >
                    Choisir un autre fichier
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#e5e5e0] shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] transition-colors">
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!parsedRows.length || importing || importDone}
                className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  importDone
                    ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
                    : 'bg-[#059669] hover:bg-[#047857] text-white'
                }`}
              >
                {importing ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importation...</>
                ) : importDone ? (
                  <><Check className="w-3.5 h-3.5" />{parsedRows.length} lead{parsedRows.length !== 1 ? 's' : ''} importé{parsedRows.length !== 1 ? 's' : ''}</>
                ) : (
                  <>Importer {parsedRows.length > 0 ? parsedRows.length : ''} lead{parsedRows.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Contacts Import Sheet */}
      <Sheet open={showContactsSheet} onOpenChange={(open) => { if (!open) setShowContactsSheet(false); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b border-[#e5e5e0]">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-[#059669]" />
              <SheetTitle className="text-sm font-bold text-[#26251e]">Importer depuis Google Contacts</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-[#7a7a76]">
              Sélectionnez les contacts à importer comme leads.
            </SheetDescription>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {contactsLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />
                ))}
              </div>
            ) : contactsConnected === false ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <Users2 className="h-10 w-10 text-[#e5e5e0]" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#26251e]">Google Contacts non connecté</p>
                  <p className="text-xs text-[#7a7a76]">Autorisez l&apos;accès à vos contacts Google pour les importer.</p>
                </div>
                <button
                  onClick={() => {
                    window.location.href = getApiUrl('/api/google/auth/start?pack=communication&redirect=/leads');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
                >
                  <Users2 className="h-3.5 w-3.5" />
                  Connecter Google Contacts
                </button>
              </div>
            ) : contactsError ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {contactsError}
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-xs text-[#7a7a76] text-center py-8">Aucun contact trouvé dans votre compte Google.</p>
            ) : (
              <>
                {/* Select all bar */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={toggleAll}
                    className="text-[11px] font-semibold text-[#059669] hover:text-[#047857] transition-colors"
                  >
                    {selectedContacts.size === contacts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  <span className="text-[10px] text-[#7a7a76]">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Contact list */}
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContacts.has(contact.id)
                        ? 'border-[#059669]/30 bg-emerald-50/40'
                        : 'border-[#e5e5e0] bg-white hover:bg-[#f4f4f3]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0 accent-[#059669]"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{contact.name || '—'}</p>
                      {contact.email && (
                        <p className="text-[10px] text-[#7a7a76] truncate">{contact.email}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {contact.company && (
                          <span className="text-[10px] text-[#7a7a76]">{contact.company}</span>
                        )}
                        {contact.phone && (
                          <span className="text-[10px] text-[#7a7a76] font-mono">{contact.phone}</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {contactsConnected !== false && !contactsLoading && contacts.length > 0 && (
            <div className="px-4 py-4 border-t border-[#e5e5e0] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[#7a7a76]">
                {selectedContacts.size} sélectionné{selectedContacts.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleImportContacts}
                disabled={!selectedContacts.size || contactsImporting || importedCount > 0}
                className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  importedCount > 0
                    ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
                    : 'bg-[#059669] hover:bg-[#047857] text-white'
                }`}
              >
                {contactsImporting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importation...</>
                ) : importedCount > 0 ? (
                  <><Check className="w-3.5 h-3.5" />{importedCount} lead{importedCount !== 1 ? 's' : ''} importé{importedCount !== 1 ? 's' : ''}</>
                ) : (
                  <>Importer {selectedContacts.size > 0 ? selectedContacts.size : ''} contact{selectedContacts.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default LeadsHeader;
