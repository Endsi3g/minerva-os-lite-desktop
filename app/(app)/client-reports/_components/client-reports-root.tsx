"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useReach } from "@/lib/reach-context";
import Link from "next/link";
import {
  Users,
  Search,
  FileText,
  Mail,
  Phone,
  MapPin,
  Share2,
  Download,
  Star,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ChevronRight,
  BarChart3,
  ClipboardList,
  MessageSquare,
  ArrowUpRight,
  Menu,
  Sparkles,
  Building,
  DollarSign,
  Printer,
  Check,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Lead, Task } from "@/lib/mock-data";
import { AnalyserSubNav } from "@/app/(app)/_components/hub-nav/analyser-sub-nav";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Livrable {
  id: string;
  service: string;
  description: string;
  prix: number;
  dateLivraison: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "d MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

const NOTE_TYPE_CONFIG = {
  visit:   { icon: MapPin,        label: "Visite",   color: "text-emerald-600",  bg: "bg-emerald-50" },
  call:    { icon: Phone,         label: "Appel",    color: "text-sky-600",      bg: "bg-sky-50"     },
  email:   { icon: Mail,          label: "Email",    color: "text-violet-600",   bg: "bg-violet-50"  },
  general: { icon: MessageSquare, label: "Note",     color: "text-[#7a7a76]",   bg: "bg-neutral-50" },
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "#059669" }: { label: string; value: string; sub?: string; icon?: React.ElementType; color?: string }) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-1.5 shadow-xs relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
        {Icon && (
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#fafaf8] border border-[#e5e5e0]">
            <Icon className="h-3 w-3" style={{ color }} />
          </div>
        )}
      </div>
      <p className="text-xl font-black text-[#26251e] truncate">{value}</p>
      {sub && <p className="text-[10px] text-[#a3a197] font-medium">{sub}</p>}
    </div>
  );
}

// Client list panel
function ClientListPanel({
  clients,
  filteredClients,
  selectedClient,
  onSelect,
  searchQuery,
  setSearchQuery,
  filterMode,
  setFilterMode,
}: {
  clients: Lead[];
  filteredClients: Lead[];
  selectedClient: Lead | null;
  onSelect: (client: Lead) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterMode: 'won' | 'all';
  setFilterMode: (m: 'won' | 'all') => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#f4f4f3]/60">
      <div className="p-4 border-b border-[#e5e5e0] space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#059669]" />
            <h2 className="text-xs font-black text-[#26251e] uppercase tracking-wider">Dossiers Clients</h2>
          </div>
          <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 rounded-full px-2 py-0.5 border border-[#059669]/20">
            {filteredClients.length}
          </span>
        </div>

        {/* Filter Mode Toggle */}
        <div className="flex p-0.5 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] text-[10px] font-bold">
          <button
            onClick={() => setFilterMode('won')}
            className={cn(
              'flex-1 py-1 rounded-md transition-all',
              filterMode === 'won' ? 'bg-white text-[#26251e] shadow-xs' : 'text-[#7a7a76] hover:text-[#26251e]'
            )}
          >
            Clients Gagnés
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              'flex-1 py-1 rounded-md transition-all',
              filterMode === 'all' ? 'bg-white text-[#26251e] shadow-xs' : 'text-[#7a7a76] hover:text-[#26251e]'
            )}
          >
            Tous les Dossiers
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5e0]/60">
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <Users className="h-8 w-8 text-[#7a7a76]/30 mx-auto" />
            <p className="text-xs text-[#7a7a76]">Aucun dossier trouvé</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-white transition-colors group",
                selectedClient?.id === client.id && "bg-white border-l-4 border-l-[#059669] shadow-xs"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#26251e] truncate group-hover:text-[#059669] transition-colors">{client.businessName}</p>
                  <p className="text-[10px] text-[#7a7a76] truncate mt-0.5">{client.niche} · {client.city || 'Montréal'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                    client.status === 'Won' ? "bg-[#059669]/10 text-[#059669] border-[#059669]/20" : "bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]"
                  )}>
                    {client.status === 'Won' ? 'Gagné' : client.status}
                  </span>
                  {client.dealAmount && (
                    <p className="text-[10px] font-black text-[#26251e] mt-1">
                      {client.dealAmount.toLocaleString("fr-CA")} $
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function ClientReportsRoot() {
  const { leads, tasks, addTask } = useReach();
  const [filterMode, setFilterMode] = useState<'won' | 'all'>('won');

  const rawClients = useMemo(() => {
    if (filterMode === 'won') {
      const won = leads.filter(l => l.status === 'Won');
      return won.length > 0 ? won : leads.slice(0, 15);
    }
    return leads;
  }, [leads, filterMode]);

  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileClientListOpen, setMobileClientListOpen] = useState(false);

  // Auto-select first lead
  useEffect(() => {
    if (!selectedClient && rawClients.length > 0) {
      setSelectedClient(rawClients[0]);
    }
  }, [rawClients, selectedClient]);

  // Livrables stored per lead
  const [livrables, setLivrables] = useState<Livrable[]>([]);
  const [livrableForm, setLivrableForm] = useState({ service: "", description: "", prix: "", dateLivraison: "" });
  const [newStep, setNewStep] = useState({ title: "", dueDate: "" });

  const filteredClients = useMemo(() => {
    return rawClients.filter(
      (c) =>
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rawClients, searchQuery]);

  useEffect(() => {
    if (!selectedClient) return;
    // Default mock livrables if none exist
    const defaultLivrables: Livrable[] = [
      { id: '1', service: 'Audit SEO & Présence Google Maps', description: 'Optimisation de la fiche Google Business, gestion des avis et mots-clés locaux.', prix: 1200, dateLivraison: '2026-09-15' },
      { id: '2', service: 'Refonte Site Web & Conversion Mobile', description: 'Création landing page haute conversion avec module de réservation en ligne.', prix: 2400, dateLivraison: '2026-09-30' },
    ];
    setLivrables(defaultLivrables);
    setLivrableForm({ service: "", description: "", prix: "", dateLivraison: "" });
    setNewStep({ title: "", dueDate: "" });
  }, [selectedClient?.id]);

  const addLivrable = () => {
    if (!livrableForm.service.trim()) return;
    const entry: Livrable = {
      id: Date.now().toString(),
      service: livrableForm.service.trim(),
      description: livrableForm.description.trim(),
      prix: parseFloat(livrableForm.prix) || 0,
      dateLivraison: livrableForm.dateLivraison || new Date().toISOString().split('T')[0],
    };
    setLivrables(prev => [...prev, entry]);
    setLivrableForm({ service: "", description: "", prix: "", dateLivraison: "" });
  };

  const removeLivrable = (id: string) => {
    setLivrables(prev => prev.filter((l) => l.id !== id));
  };

  const handleCopyLink = () => {
    if (!selectedClient) return;
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/client/${selectedClient.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleAddStep = () => {
    if (!selectedClient || !newStep.title.trim()) return;
    addTask(newStep.title.trim(), "General", newStep.dueDate || undefined);
    setNewStep({ title: "", dueDate: "" });
  };

  const totalLivrables = livrables.reduce((sum, l) => sum + l.prix, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      <AnalyserSubNav />
      <div className="flex-1 flex overflow-hidden text-[#26251e] relative min-h-0">
        {/* Left panel: Client list */}
        <aside className="relative z-10 hidden md:flex flex-col w-72 shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] overflow-hidden print:hidden">
          <ClientListPanel
            clients={rawClients}
            filteredClients={filteredClients}
            selectedClient={selectedClient}
            onSelect={setSelectedClient}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
          />
        </aside>

        {/* Mobile sheet */}
        <Sheet open={mobileClientListOpen} onOpenChange={setMobileClientListOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#f4f4f3]">
            <SheetHeader className="sr-only">
              <SheetTitle>Vos dossiers clients</SheetTitle>
            </SheetHeader>
            <ClientListPanel
              clients={rawClients}
              filteredClients={filteredClients}
              selectedClient={selectedClient}
              onSelect={(c) => { setSelectedClient(c); setMobileClientListOpen(false); }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
            />
          </SheetContent>
        </Sheet>

        {/* Main detail view */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {selectedClient ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
              {/* Header card */}
              <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setMobileClientListOpen(true)}
                    className="md:hidden p-2 rounded-lg border border-[#e5e5e0] bg-[#fafaf8]"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-black text-[#26251e] tracking-tight">{selectedClient.businessName}</h1>
                      <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/20">
                        {selectedClient.niche}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a7a76] mt-1 flex items-center gap-3">
                      <span>{selectedClient.contactName || "Directeur"}</span>
                      <span>·</span>
                      <span>{selectedClient.city || "Montréal"}</span>
                      {selectedClient.rating && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-[#d97706] font-bold">
                            <Star className="h-3 w-3 fill-current" /> {selectedClient.rating} ({selectedClient.reviewsCount} avis)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#26251e] bg-white border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors shadow-xs"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-[#059669]" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? "Lien copié !" : "Partager"}</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition-colors shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Imprimer / PDF</span>
                  </button>
                </div>
              </div>

              {/* Stats KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="MRR Estimé" value={`${(selectedClient.dealAmount || 2200).toLocaleString("fr-CA")} $`} sub="Valeur contrat" icon={DollarSign} color="#059669" />
                <StatCard label="Indice Intention" value={`${selectedClient.intentScore || 85}/100`} sub="Score de closing" icon={Target} color="#7c3aed" />
                <StatCard label="Livrables Actifs" value={`${livrables.length}`} sub={`${totalLivrables.toLocaleString("fr-CA")} $ total`} icon={ClipboardList} color="#3b82f6" />
                <StatCard label="Date Début" value={formatDate(selectedClient.createdAt)} sub="Historique CRM" icon={Clock} color="#d97706" />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="livrables" className="w-full space-y-4">
                <TabsList className="bg-[#f4f4f3] p-1 border border-[#e5e5e0] rounded-xl">
                  <TabsTrigger value="livrables" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg">
                    Livrables & Prestations ({livrables.length})
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg">
                    Diagnostic & Opportunités
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg">
                    Coordonnées & Fiche 360
                  </TabsTrigger>
                </TabsList>

                {/* Tab Livrables */}
                <TabsContent value="livrables" className="space-y-4">
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f4f4f3] pb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#26251e]">Prestations planifiées</h3>
                      <span className="text-xs font-black text-[#059669] bg-[#059669]/10 px-2.5 py-1 rounded-lg">
                        Total : {totalLivrables.toLocaleString("fr-CA")} $
                      </span>
                    </div>

                    <div className="divide-y divide-[#f4f4f3]">
                      {livrables.map((l) => (
                        <div key={l.id} className="py-3.5 flex items-start justify-between gap-4 group">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-[#26251e]">{l.service}</p>
                            <p className="text-[11px] text-[#7a7a76] leading-relaxed">{l.description}</p>
                            <span className="text-[10px] text-[#a3a197] font-semibold">Échéance : {formatDate(l.dateLivraison)}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-[#26251e]">{l.prix.toLocaleString("fr-CA")} $</span>
                            <button
                              onClick={() => removeLivrable(l.id)}
                              className="text-[#7a7a76] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add form */}
                    <div className="pt-4 border-t border-[#f4f4f3] grid grid-cols-1 sm:grid-cols-4 gap-2 print:hidden">
                      <input
                        type="text"
                        placeholder="Service..."
                        value={livrableForm.service}
                        onChange={(e) => setLivrableForm({ ...livrableForm, service: e.target.value })}
                        className="text-xs p-2 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669]"
                      />
                      <input
                        type="text"
                        placeholder="Description..."
                        value={livrableForm.description}
                        onChange={(e) => setLivrableForm({ ...livrableForm, description: e.target.value })}
                        className="text-xs p-2 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669]"
                      />
                      <input
                        type="number"
                        placeholder="Prix ($)..."
                        value={livrableForm.prix}
                        onChange={(e) => setLivrableForm({ ...livrableForm, prix: e.target.value })}
                        className="text-xs p-2 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669]"
                      />
                      <button
                        onClick={addLivrable}
                        className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg p-2 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab Audit */}
                <TabsContent value="audit" className="space-y-4">
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#059669]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#26251e]">Recommandations d&apos;accroissement MRR</h3>
                    </div>
                    <p className="text-xs text-[#7a7a76] leading-relaxed">
                      {selectedClient.businessName} dispose d&apos;un potentiel commercial élevé avec {selectedClient.reviewsCount} avis et une note de {selectedClient.rating}/5.
                      La mise en place d&apos;une relance multicanal automatisée permettra d&apos;optimiser le taux de réservation directe de 30 %.
                    </p>
                    <div className="p-4 rounded-xl bg-[#fafaf8] border border-[#e5e5e0] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#26251e]">Lancer un audit technique complet</p>
                        <p className="text-[11px] text-[#7a7a76]">Vérifiez la vitesse, le SEO et les balises de leur site.</p>
                      </div>
                      <Link
                        href={`/audit?url=${encodeURIComponent(selectedClient.website || "example.com")}`}
                        className="bg-[#059669] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#047857] transition-colors"
                      >
                        Auditer →
                      </Link>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab Contact */}
                <TabsContent value="contact" className="space-y-4">
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs space-y-3 text-xs">
                    <p><strong>Téléphone :</strong> {selectedClient.phone || "Non renseigné"}</p>
                    <p><strong>Email :</strong> {selectedClient.contactEmail || "Non renseigné"}</p>
                    <p><strong>Adresse :</strong> {selectedClient.address || "Montréal, QC"}</p>
                    <p><strong>Site web :</strong> <a href={selectedClient.website} target="_blank" rel="noreferrer" className="text-[#059669] underline">{selectedClient.website || "Non renseigné"}</a></p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[#7a7a76]">
              <Users className="h-10 w-10 text-[#e5e5e0] mb-2" />
              <p className="text-xs font-bold">Sélectionnez un client dans la liste</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ClientReportsRoot;
