'use client';

import React, { useState } from 'react';
import { useReach } from '@/lib/reach-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const LEAD_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'businessName', label: 'Nom de l\'entreprise', required: true },
  { key: 'contactName', label: 'Nom du contact' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'city', label: 'Ville' },
  { key: 'niche', label: 'Secteur' },
  { key: 'website', label: 'Site web' },
  { key: 'mapsUrl', label: 'Lien Google Maps' },
  { key: 'rating', label: 'Note' },
  { key: 'reviewsCount', label: 'Nombre d\'avis' },
  { key: 'address', label: 'Adresse complète' },
  { key: 'notes', label: 'Notes de terrain / Commentaires' },
  { key: 'ignore', label: '— Ignorer cette colonne —' },
];

// Parseur CSV minimal mais robuste aux champs entre guillemets contenant des virgules.
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  };
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function guessMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((h, i) => {
    const norm = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/entreprise|business|company|name|nom$/.test(norm) && !/contact/.test(norm)) mapping[i] = 'businessName';
    else if (/contact.*name|nom.*contact/.test(norm)) mapping[i] = 'contactName';
    else if (/email|courriel/.test(norm)) mapping[i] = 'contactEmail';
    else if (/phone|tel|telephone/.test(norm)) mapping[i] = 'phone';
    else if (/city|ville/.test(norm)) mapping[i] = 'city';
    else if (/niche|secteur|category|categorie/.test(norm)) mapping[i] = 'niche';
    else if (/website|site.?web|url/.test(norm)) mapping[i] = 'website';
    else if (/google.*maps|lien.*maps|maps.*url|liens.*google.*maps/.test(norm)) mapping[i] = 'mapsUrl';
    else if (/rating|note|score/.test(norm)) mapping[i] = 'rating';
    else if (/revues|reviews|avis|count/.test(norm)) mapping[i] = 'reviewsCount';
    else if (/address|adresse|rue/.test(norm)) mapping[i] = 'address';
    else if (/commentaires|notes.*terrain|terrain.*notes|notes.*de.*terrain/.test(norm)) mapping[i] = 'notes';
    else mapping[i] = h.trim() ? `custom__${h.trim()}` : 'ignore';
  });
  return mapping;
}

export function CsvImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const { addLead } = useReach();
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [defaultCity, setDefaultCity] = useState('Montréal');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reset = () => {
    setFileName(''); setHeaders([]); setRows([]); setMapping({}); setProgress(null); setDefaultCity('Montréal');
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.headers));
  };

  const businessNameColIdx = Object.entries(mapping).find(([, v]) => v === 'businessName')?.[0];
  const canImport = businessNameColIdx !== undefined && rows.length > 0;

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    let success = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const get = (field: string) => {
        const idx = Object.entries(mapping).find(([, v]) => v === field)?.[0];
        return idx !== undefined ? (row[Number(idx)] || '') : '';
      };
      
      const customFields: Record<string, string> = {};
      Object.entries(mapping).forEach(([colIdx, mappedField]) => {
        if (mappedField.startsWith('custom__')) {
          const fieldName = mappedField.replace('custom__', '');
          const val = row[Number(colIdx)] || '';
          if (val.trim()) {
            customFields[fieldName] = val.trim();
          }
        }
      });

      const businessName = get('businessName');
      if (businessName.trim()) {
        const rawRating = get('rating').trim().replace(',', '.');
        const rating = rawRating ? parseFloat(rawRating) : undefined;
        const rawReviewsCount = get('reviewsCount').trim();
        const reviewsCount = rawReviewsCount ? parseInt(rawReviewsCount, 10) : undefined;

        try {
          await (addLead as (data: Parameters<typeof addLead>[0]) => Promise<void>)({
            businessName: businessName.trim(),
            contactName: get('contactName').trim(),
            contactEmail: get('contactEmail').trim() || undefined,
            phone: get('phone').trim() || undefined,
            city: get('city').trim() || defaultCity.trim(),
            niche: get('niche').trim(),
            website: get('website').trim() || undefined,
            mapsUrl: get('mapsUrl').trim() || undefined,
            rating: isNaN(rating as any) ? undefined : rating,
            reviewsCount: isNaN(reviewsCount as any) ? undefined : reviewsCount,
            address: get('address').trim() || undefined,
            notes: get('notes').trim() || undefined,
            status: 'New',
            temperature: 'Warm',
            source: 'csv',
            nextAction: '',
            nextActionDate: '',
            customFields,
          });
          success++;
        } catch { /* continue with next row */ }
      }
      setProgress({ done: i + 1, total: rows.length });
    }
    setImporting(false);
    toast.success(`${success} lead${success !== 1 ? 's' : ''} importé${success !== 1 ? 's' : ''} sur ${rows.length}.`);
    onImported();
    onClose();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#26251e]">Importer des leads depuis un CSV</DialogTitle>
        </DialogHeader>

        {!fileName ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#e5e5e0] rounded-xl py-12 cursor-pointer hover:border-[#059669]/40 hover:bg-[#059669]/5 transition-colors">
            <Upload className="h-8 w-8 text-[#7a7a76]" />
            <div className="text-center">
              <p className="text-xs font-bold text-[#26251e]">Cliquez pour choisir un fichier CSV</p>
              <p className="text-[10px] text-[#7a7a76] mt-1">La première ligne doit contenir les en-têtes de colonnes.</p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
              <FileText className="h-3.5 w-3.5" />
              {fileName} — {rows.length} ligne{rows.length !== 1 ? 's' : ''} détectée{rows.length !== 1 ? 's' : ''}
              <button type="button" onClick={reset} className="ml-auto text-[#059669] font-bold hover:underline">Changer de fichier</button>
            </div>

            <div className="space-y-1.5 bg-[#fafaf9] border border-[#e5e5e0] rounded-xl p-3.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Ville par défaut</label>
              <p className="text-[10px] text-[#7a7a76] leading-relaxed">
                Sera utilisée comme valeur si la colonne Ville n'est pas présente dans le fichier CSV ou si certaines lignes sont vides.
              </p>
              <Input
                type="text"
                value={defaultCity}
                onChange={(e) => setDefaultCity(e.target.value)}
                placeholder="Ex: Montréal, Québec..."
                className="text-xs bg-white mt-1 h-8 text-[#26251e] border-[#e5e5e0] focus:border-[#059669]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Associer les colonnes</p>
              <div className="border border-[#e5e5e0] rounded-lg overflow-hidden divide-y divide-[#e5e5e0]">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs font-semibold text-[#26251e] flex-1 truncate">{h || `Colonne ${i + 1}`}</span>
                    <span className="text-[10px] text-[#7a7a76] flex-1 truncate italic">{rows[0]?.[i] || '—'}</span>
                    <select
                      value={mapping[i] || 'ignore'}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [i]: e.target.value }))}
                      className="text-[11px] border border-[#e5e5e0] rounded px-2 py-1.5 bg-white shrink-0"
                    >
                      {LEAD_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      {h && h.trim() && !LEAD_FIELDS.some((f) => f.key === h.trim()) && (
                        <option value={`custom__${h.trim()}`}>Créer le champ &quot;{h.trim()}&quot;</option>
                      )}
                    </select>
                  </div>
                ))}
              </div>
              {!canImport && (
                <p className="text-[10px] text-amber-600">Associez au moins une colonne à "Nom de l'entreprise" pour continuer.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { onClose(); reset(); }} className="h-8 text-xs">Annuler</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={!canImport || importing}
                className="h-8 text-xs bg-[#059669] hover:bg-[#047857] gap-1.5"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {importing
                  ? `Import… ${progress?.done ?? 0}/${progress?.total ?? rows.length}`
                  : `Importer ${rows.length} lead${rows.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
