'use client';

import React, { useState, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ShieldOff,
  Monitor,
  FileText,
  BarChart3,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Info,
  Building,
  ExternalLink,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import type { SeoAuditResult, SeoAuditError } from '@/lib/audit-types';
import { AnalyserSubNav } from '@/app/(app)/_components/hub-nav/analyser-sub-nav';

type AuditResponse = SeoAuditResult | SeoAuditError;

function isError(r: AuditResponse): r is SeoAuditError {
  return 'error' in r;
}

// Score circle colored by value
function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 70 ? '#059669' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 70 ? 'Bon' : score >= 40 ? 'Moyen' : 'Faible';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full border-4 text-2xl font-black"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  if (severity === 'error') return <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
}

function CheckBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border',
        ok
          ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
          : 'bg-red-50 text-red-600 border-red-200'
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
      {label}
    </span>
  );
}

function AuditResultCard({
  result,
  onViewUrl,
}: {
  result: SeoAuditResult;
  onViewUrl?: (url: string) => void;
}) {
  return (
    <Card className="border border-[#e5e5e0]">
      <CardHeader className="pb-3 border-b border-[#e5e5e0]">
        <div className="flex items-start gap-4">
          <ScoreCircle score={result.score} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#7a7a76] mb-1 break-all">{result.url}</p>
            <p className="text-sm font-bold text-[#26251e]">Score SEO : {result.score}/100</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">
              Temps de chargement :{' '}
              <span
                className={cn(
                  'font-semibold',
                  result.loadTime < 2000
                    ? 'text-[#059669]'
                    : result.loadTime < 4000
                    ? 'text-amber-500'
                    : 'text-red-500'
                )}
              >
                {result.loadTime}ms
              </span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Technique */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">
            Technique
          </p>
          <div className="flex flex-wrap gap-2">
            <CheckBadge ok={result.https} label="HTTPS" />
            <CheckBadge ok={result.hasViewport} label="Mobile" />
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border',
                result.h1Count === 1
                  ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              )}
            >
              H1: {result.h1Count}
            </span>
          </div>
        </div>

        {/* Contenu */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">
            Contenu
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-[#7a7a76] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-bold text-[#7a7a76]">TITRE</span>
                  <span
                    className={cn(
                      'text-[9px] font-bold rounded px-1',
                      result.hasTitle && result.titleLength >= 50 && result.titleLength <= 70
                        ? 'bg-[#059669]/10 text-[#059669]'
                        : result.hasTitle
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                    )}
                  >
                    {result.titleLength} car.
                  </span>
                </div>
                <p className="text-[11px] text-[#26251e] truncate">
                  {result.title || <em className="text-[#7a7a76]">Absent</em>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Globe className="h-3.5 w-3.5 text-[#7a7a76] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-bold text-[#7a7a76]">DESCRIPTION</span>
                  <span
                    className={cn(
                      'text-[9px] font-bold rounded px-1',
                      result.hasDescription && result.descriptionLength >= 120 && result.descriptionLength <= 160
                        ? 'bg-[#059669]/10 text-[#059669]'
                        : result.hasDescription
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                    )}
                  >
                    {result.descriptionLength} car.
                  </span>
                </div>
                <p className="text-[11px] text-[#26251e] line-clamp-2">
                  {result.descriptionContent || <em className="text-[#7a7a76]">Absente</em>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">
            Tracking
          </p>
          <div className="flex flex-wrap gap-2">
            <CheckBadge ok={result.hasGA} label="Google Analytics" />
            <CheckBadge ok={result.hasFBPixel} label="FB Pixel" />
          </div>
        </div>

        {/* Recommandations */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">
            Recommandations
          </p>
          <ul className="space-y-1.5">
            {result.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-[#26251e]">
                <SeverityIcon severity={issue.severity} />
                <span>{issue.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {onViewUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onViewUrl(result.url)}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Auditer cette URL
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Concurrency limiter
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

interface BatchResult {
  lead: Lead;
  result: AuditResponse | null;
  loading: boolean;
}

export function AuditRoot() {
  const { leads } = useReach();

  // Single URL mode
  const [singleUrl, setSingleUrl] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<SeoAuditResult | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  // Batch mode
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [selectedBatchLead, setSelectedBatchLead] = useState<Lead | null>(null);

  const runSingleAudit = useCallback(async (url?: string) => {
    const target = (url || singleUrl).trim();
    if (!target) return;

    setSingleLoading(true);
    setSingleResult(null);
    setSingleError(null);
    setSelectedBatchLead(null);

    try {
      const res = await fetch(getApiUrl('/api/audit-seo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data: AuditResponse = await res.json();
      if (isError(data)) {
        setSingleError(`Impossible d'atteindre ${data.url}. Vérifiez l'URL et réessayez.`);
      } else {
        setSingleResult(data);
      }
    } catch {
      setSingleError('Erreur réseau lors de l\'audit.');
    } finally {
      setSingleLoading(false);
    }
  }, [singleUrl]);

  const runBatchAudit = useCallback(async () => {
    const leadsWithWebsite = leads.filter((l) => l.website);
    if (leadsWithWebsite.length === 0) return;

    // Initialize loading state for each lead
    const initial: BatchResult[] = leadsWithWebsite.map((l) => ({
      lead: l,
      result: null,
      loading: true,
    }));
    setBatchResults(initial);
    setBatchRunning(true);

    const tasks = leadsWithWebsite.map((lead) => async () => {
      try {
        const res = await fetch(getApiUrl('/api/audit-seo'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lead.website }),
        });
        const data: AuditResponse = await res.json();
        setBatchResults((prev) =>
          prev.map((r) =>
            r.lead.id === lead.id ? { ...r, result: data, loading: false } : r
          )
        );
        return data;
      } catch {
        setBatchResults((prev) =>
          prev.map((r) =>
            r.lead.id === lead.id ? { ...r, result: null, loading: false } : r
          )
        );
        return null;
      }
    });

    await runWithConcurrency(tasks, 3);
    setBatchRunning(false);
  }, [leads]);

  const handleViewDetail = (lead: Lead, result: SeoAuditResult) => {
    setSelectedBatchLead(lead);
    setSingleUrl(result.url);
    setSingleResult(result);
    setSingleError(null);
  };

  const handleExportPdf = async () => {
    if (!singleResult) return;
    setPdfExporting(true);
    try {
      const res = await fetch(getApiUrl('/api/audit-seo/export-pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditResult: singleResult,
          businessName: selectedBatchLead?.businessName || singleUrl,
        }),
      });
      const data = await res.json();
      if (data.html) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(data.html);
          win.document.close();
          win.print();
        }
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  const leadsWithWebsite = leads.filter((l) => l.website);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      <AnalyserSubNav />
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
        <div className="relative z-10 flex flex-col gap-6 max-w-4xl mx-auto w-full p-4 md:p-8">
          {/* Header */}
          <div className="border-b border-[#e5e5e0] pb-4">
            <h1 className="text-2xl font-heading font-sans font-black tracking-tight text-[#14171A]">Audit SEO & Technique</h1>
            <p className="text-xs text-[#4B5158] mt-1 font-medium">
              Analysez le référencement, la vitesse et la réputation de n'importe quel prospect pour générer un argumentaire commercial.
            </p>
          </div>

        {/* Single URL mode */}
        <Card className="border border-[#e5e5e0]">
          <CardHeader className="pb-3 border-b border-[#e5e5e0]">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#059669]" />
              Audit URL unique
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="https://exemple.com"
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSingleAudit();
                }}
              />
              <Button
                onClick={() => runSingleAudit()}
                disabled={singleLoading || !singleUrl.trim()}
                className="bg-[#059669] hover:bg-[#047857] text-white shrink-0"
              >
                {singleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyse...
                  </>
                ) : (
                  'Lancer l\'audit'
                )}
              </Button>
            </div>

            {singleLoading && (
              <div className="flex items-center gap-2 text-sm text-[#7a7a76]">
                <Loader2 className="h-4 w-4 animate-spin text-[#059669]" />
                Analyse en cours... Chargement et analyse du site.
              </div>
            )}

            {singleError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {singleError}
              </div>
            )}

            {selectedBatchLead && singleResult && (
              <div className="text-xs text-[#7a7a76] flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                Détail pour : <span className="font-semibold text-[#26251e]">{selectedBatchLead.businessName}</span>
              </div>
            )}

            {singleResult && !singleLoading && (
              <>
                <AuditResultCard result={singleResult} />
                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 border-[#e5e5e0] text-[#26251e] hover:bg-[#fafaf8]"
                    onClick={handleExportPdf}
                    disabled={pdfExporting}
                  >
                    {pdfExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Exporter en PDF
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Batch mode */}
        <Card className="border border-[#e5e5e0]">
          <CardHeader className="pb-3 border-b border-[#e5e5e0]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#059669]" />
                Audit du portefeuille
                <Badge variant="outline" className="text-[10px] font-bold ml-1">
                  {leadsWithWebsite.length} site{leadsWithWebsite.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={runBatchAudit}
                disabled={batchRunning || leadsWithWebsite.length === 0}
              >
                {batchRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Audit en cours...
                  </>
                ) : (
                  'Auditer mon portefeuille'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leadsWithWebsite.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#7a7a76]">
                Aucun lead avec un site web dans votre portefeuille.
                <br />
                <span className="text-[11px]">Ajoutez des sites web à vos leads pour les auditer.</span>
              </div>
            ) : batchResults.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#7a7a76]">
                Cliquez sur "Auditer mon portefeuille" pour lancer l'analyse.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e5e0] bg-[#fafaf8]">
                      <th className="text-left px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Entreprise</th>
                      <th className="text-left px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">URL</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Score</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">HTTPS</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Mobile</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Titre</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Desc</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Charge</th>
                      <th className="text-center px-4 py-2.5 font-bold text-[#7a7a76] uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((item) => {
                      const res = item.result && !isError(item.result) ? item.result as SeoAuditResult : null;
                      const err = item.result && isError(item.result);
                      return (
                        <tr key={item.lead.id} className="border-b border-[#e5e5e0] hover:bg-[#fafaf8] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#26251e]">
                            {item.lead.businessName}
                          </td>
                          <td className="px-4 py-3 text-[#7a7a76] max-w-[180px] truncate">
                            {item.lead.website}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.loading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7a7a76] mx-auto" />
                            ) : err ? (
                              <span className="text-red-500 text-[10px] font-bold">Erreur</span>
                            ) : res ? (
                              <span
                                className="inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black"
                                style={{
                                  backgroundColor:
                                    res.score >= 70
                                      ? '#059669' + '1a'
                                      : res.score >= 40
                                      ? '#f59e0b' + '1a'
                                      : '#ef4444' + '1a',
                                  color:
                                    res.score >= 70
                                      ? '#059669'
                                      : res.score >= 40
                                      ? '#f59e0b'
                                      : '#ef4444',
                                  borderColor:
                                    res.score >= 70
                                      ? '#059669' + '33'
                                      : res.score >= 40
                                      ? '#f59e0b' + '33'
                                      : '#ef4444' + '33',
                                }}
                              >
                                {res.score}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res ? (
                              res.https ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mx-auto" />
                              ) : (
                                <ShieldOff className="h-3.5 w-3.5 text-red-500 mx-auto" />
                              )
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res ? (
                              res.hasViewport ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mx-auto" />
                              ) : (
                                <Monitor className="h-3.5 w-3.5 text-red-500 mx-auto" />
                              )
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res ? (
                              res.hasTitle ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mx-auto" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                              )
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res ? (
                              res.hasDescription ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mx-auto" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                              )
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res ? (
                              <span
                                className={cn(
                                  'text-[10px] font-bold',
                                  res.loadTime < 2000
                                    ? 'text-[#059669]'
                                    : res.loadTime < 4000
                                    ? 'text-amber-500'
                                    : 'text-red-500'
                                )}
                              >
                                {res.loadTime}ms
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {res && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 px-2 text-[#059669] hover:bg-[#059669]/10"
                                onClick={() => handleViewDetail(item.lead, res)}
                              >
                                Voir détail
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default AuditRoot;
