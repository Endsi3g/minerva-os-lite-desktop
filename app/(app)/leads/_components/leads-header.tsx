'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { Plus, Upload, X, FileText, Check, AlertCircle } from 'lucide-react';

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

export function LeadsHeader() {
  const { leads, addLead } = useReach();

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
        status: (['New','Contacted','Meeting Booked','Won','Lost'].includes(row.status) ? row.status : 'New') as Lead['status'],
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Portefeuille des opportunités de prospection locale ({leads.length} prospect{leads.length !== 1 ? 's' : ''} au total).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowModal(true)}>
            <Upload className="h-3.5 w-3.5" />
            Importer CSV
          </Button>
          <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90">
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
    </>
  );
}

export default LeadsHeader;
