"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Lead, Task } from "@/lib/mock-data";

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
  general: { icon: MessageSquare, label: "Note",     color: "text-[#807d72]",   bg: "bg-neutral-50" },
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{label}</p>
      <p className="text-lg font-black text-[#26251e] truncate">{value}</p>
      {sub && <p className="text-[10px] text-[#807d72]">{sub}</p>}
    </div>
  );
}

// Client list — shared between the desktop sidebar and the mobile sheet
function ClientListPanel({
  clients,
  filteredClients,
  selectedClient,
  onSelect,
  searchQuery,
  setSearchQuery,
}: {
  clients: Lead[];
  filteredClients: Lead[];
  selectedClient: Lead | null;
  onSelect: (client: Lead) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-[#e5e5e0] space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#059669]" />
          <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Vos clients</h2>
          <span className="ml-auto text-[10px] font-semibold text-[#807d72] bg-[#e5e5e0] rounded-full px-2 py-0.5">
            {clients.length}
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#807d72]" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669] transition-colors"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5e0]/60">
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <Users className="h-8 w-8 text-[#807d72]/30 mx-auto" />
            <p className="text-xs text-[#807d72]">
              {clients.length === 0
                ? "Aucun client gagné pour l'instant"
                : "Aucun résultat"}
            </p>
            {clients.length === 0 && (
              <Link href="/leads" className="text-[10px] text-[#059669] hover:underline font-semibold">
                Voir vos prospects →
              </Link>
            )}
          </div>
        ) : (
          filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-[#e5e5e0]/40 transition-colors group",
                selectedClient?.id === client.id && "bg-[#059669]/8 border-r-2 border-[#059669]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#26251e] truncate">{client.businessName}</p>
                  <p className="text-[10px] text-[#807d72] truncate mt-0.5">{client.contactName}</p>
                  <p className="text-[10px] text-[#807d72] truncate">{client.city}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded-full block">
                    Gagné
                  </span>
                  {client.dealAmount && (
                    <p className="text-[10px] font-semibold text-[#26251e] mt-1">
                      {client.dealAmount.toLocaleString("fr-CA")} $
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function ClientReportsRoot() {
  const { leads, tasks, addTask } = useReach();

  // Only Won leads = clients
  const clients = [...leads]
    .filter((l) => l.status === "Won")
    .sort((a, b) => (b.dealAmount || 0) - (a.dealAmount || 0));

  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileClientListOpen, setMobileClientListOpen] = useState(false);

  // Livrables stored per lead in Supabase
  const [livrables, setLivrables] = useState<Livrable[]>([]);
  const [livrableForm, setLivrableForm] = useState({ service: "", description: "", prix: "", dateLivraison: "" });

  // Prochaines étapes quick-add
  const [newStep, setNewStep] = useState({ title: "", dueDate: "" });

  const filteredClients = clients.filter(
    (c) =>
      c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load livrables from Supabase on client change
  useEffect(() => {
    if (!selectedClient) return;
    fetch(`/api/leads/${selectedClient.id}/livrables`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // lead_livrables is stored as { items: Livrable[] } or a plain array
        const raw = d?.livrables;
        if (Array.isArray(raw)) setLivrables(raw);
        else if (raw?.items && Array.isArray(raw.items)) setLivrables(raw.items);
        else setLivrables([]);
      })
      .catch(() => setLivrables([]));
    setLivrableForm({ service: "", description: "", prix: "", dateLivraison: "" });
    setNewStep({ title: "", dueDate: "" });
  }, [selectedClient?.id]);

  const saveLivrables = useCallback(
    (updated: Livrable[]) => {
      if (!selectedClient) return;
      setLivrables(updated);
      // Persist to Supabase
      fetch(`/api/leads/${selectedClient.id}/livrables`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livrables: updated }),
      }).catch(() => {});
    },
    [selectedClient]
  );

  const addLivrable = () => {
    if (!livrableForm.service.trim()) return;
    const entry: Livrable = {
      id: Date.now().toString(),
      service: livrableForm.service.trim(),
      description: livrableForm.description.trim(),
      prix: parseFloat(livrableForm.prix) || 0,
      dateLivraison: livrableForm.dateLivraison,
    };
    saveLivrables([...livrables, entry]);
    setLivrableForm({ service: "", description: "", prix: "", dateLivraison: "" });
  };

  const removeLivrable = (id: string) => {
    saveLivrables(livrables.filter((l) => l.id !== id));
  };

  const handleCopyLink = () => {
    if (!selectedClient) return;
    const link = `${window.location.origin}/review/${selectedClient.id}`;
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

  // Tasks for selected client — Task has no leadId; show workspace tasks filtered by title match to client name
  const clientTasks = selectedClient
    ? tasks.filter((t) => t.title.toLowerCase().includes(selectedClient.businessName.toLowerCase()))
    : [];
  const pendingTasks = clientTasks.filter((t) => !t.completed);
  const doneTasks = clientTasks.filter((t) => t.completed);

  // KPIs from notes
  const clientNotes = selectedClient?.notes || [];
  const notesCount = clientNotes.length;
  const callsCount = clientNotes.filter((n) => n.type === "call").length;
  const emailsCount = clientNotes.filter((n) => n.type === "email").length;
  const visitsCount = clientNotes.filter((n) => n.type === "visit").length;

  // Total livrables value
  const totalLivrables = livrables.reduce((sum, l) => sum + l.prix, 0);

  return (
    <div className="h-full flex overflow-hidden bg-[#fafaf8] text-[#26251e] relative">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      {/* ── Left panel: Client list ── */}
      <aside className="relative z-10 hidden md:flex flex-col w-72 shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] overflow-hidden print:hidden">
        <ClientListPanel
          clients={clients}
          filteredClients={filteredClients}
          selectedClient={selectedClient}
          onSelect={setSelectedClient}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </aside>

      {/* ── Mobile client switcher — slides over from the left ── */}
      <Sheet open={mobileClientListOpen} onOpenChange={setMobileClientListOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#f4f4f3]">
          <SheetHeader className="sr-only">
            <SheetTitle>Vos clients</SheetTitle>
          </SheetHeader>
          <ClientListPanel
            clients={clients}
            filteredClients={filteredClients}
            selectedClient={selectedClient}
            onSelect={(client) => { setSelectedClient(client); setMobileClientListOpen(false); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </SheetContent>
      </Sheet>

      {/* ── Right panel: Report ── */}
      <main className="relative z-10 flex-1 overflow-y-auto flex flex-col">
        {/* Mobile-only bar: switch between clients */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-[#e5e5e0] bg-white shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setMobileClientListOpen(true)}
            className="p-1.5 -ml-1.5 text-[#807d72] hover:text-[#26251e] transition-colors shrink-0"
            aria-label="Changer de client"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-bold text-[#26251e] truncate">
            {selectedClient ? selectedClient.businessName : "Sélectionner un client"}
          </p>
        </div>

        {!selectedClient ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#e5e5e0]/60 border border-[#e5e5e0] flex items-center justify-center">
              <Users className="h-8 w-8 text-[#807d72]/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#26251e]">Sélectionnez un client pour voir son rapport</p>
              <p className="text-xs text-[#807d72]">
                {clients.length === 0
                  ? "Marquez un prospect comme \"Gagné\" pour le retrouver ici."
                  : (
                    <>
                      <span className="md:hidden">Touchez le menu ci-dessus pour choisir un client.</span>
                      <span className="hidden md:inline">
                        {clients.length} client{clients.length > 1 ? "s" : ""} disponible{clients.length > 1 ? "s" : ""} dans le panneau gauche.
                      </span>
                    </>
                  )}
              </p>
            </div>
            {clients.length === 0 && (
              <Link
                href="/leads"
                className="text-xs font-semibold text-[#059669] hover:text-[#047857] flex items-center gap-1"
              >
                Voir vos prospects <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-4xl mx-auto">

            {/* ── Client Header ── */}
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-black text-[#26251e] truncate">{selectedClient.businessName}</h1>
                    <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 border border-[#059669]/20 px-2 py-0.5 rounded-full shrink-0">
                      Gagné ✓
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-[#807d72]">
                    {selectedClient.contactName && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {selectedClient.contactName}
                      </span>
                    )}
                    {selectedClient.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedClient.contactEmail}
                      </span>
                    )}
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedClient.phone}
                      </span>
                    )}
                    {selectedClient.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedClient.city}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedClient.dealAmount && (
                      <span className="text-sm font-black text-[#26251e] bg-[#f4f4f3] border border-[#e5e5e0] px-3 py-1 rounded-full">
                        {selectedClient.dealAmount.toLocaleString("fr-CA")} $ CAD
                      </span>
                    )}
                    {selectedClient.dealClosingDate && (
                      <span className="text-xs text-[#807d72]">
                        Conclu le {formatDate(selectedClient.dealClosingDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                      copiedLink
                        ? "bg-[#059669]/10 border-[#059669]/30 text-[#059669]"
                        : "bg-white border-[#e5e5e0] text-[#555552] hover:border-[#059669] hover:text-[#059669]"
                    )}
                    title="Copier le lien de partage"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {copiedLink ? "Lien copié !" : "Partager"}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#e5e5e0] bg-white text-[#555552] hover:border-[#26251e] hover:text-[#26251e] transition-all cursor-pointer print:hidden"
                    title="Exporter en PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="rapport" className="space-y-4">
              <TabsList className="bg-[#e5e5e0]/60 p-1 rounded-xl w-full sm:w-fit">
                <TabsTrigger value="rapport" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Rapport
                </TabsTrigger>
                <TabsTrigger value="livrables" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Livrables
                </TabsTrigger>
                <TabsTrigger value="historique" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Historique
                </TabsTrigger>
                <TabsTrigger value="etapes" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Prochaines étapes
                </TabsTrigger>
              </TabsList>

              {/* ─── Rapport Tab ─── */}
              <TabsContent value="rapport" className="space-y-5">
                {/* 4 stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Valeur du deal"
                    value={selectedClient.dealAmount ? `${selectedClient.dealAmount.toLocaleString("fr-CA")} $` : "N/A"}
                    sub="CAD"
                  />
                  <StatCard
                    label="Score lead"
                    value={selectedClient.score ? `${selectedClient.score}/100` : "N/A"}
                    sub={selectedClient.score && selectedClient.score >= 70 ? "Excellent" : selectedClient.score && selectedClient.score >= 40 ? "Bon potentiel" : "—"}
                  />
                  <StatCard
                    label="Niche"
                    value={selectedClient.niche || "—"}
                    sub={selectedClient.city || undefined}
                  />
                  <StatCard
                    label="Date client"
                    value={selectedClient.dealClosingDate ? formatDate(selectedClient.dealClosingDate) : "—"}
                    sub="Date de clôture"
                  />
                </div>

                {/* Satisfaction widget */}
                <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#059669]" />
                    <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Satisfaction client</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-sm font-black text-[#26251e]">5 / 5</span>
                  </div>
                  <p className="text-xs text-[#807d72] italic">
                    Évaluation client à venir — partagez le lien de rapport pour recueillir un avis.
                  </p>
                </div>

                {/* KPIs section */}
                <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#059669]" />
                    <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">KPIs du parcours</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-xl bg-[#fafaf8] border border-[#e5e5e0]">
                      <p className="text-2xl font-black text-[#26251e]">{notesCount}</p>
                      <p className="text-[10px] font-semibold text-[#807d72] uppercase tracking-wider mt-0.5">Interactions</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-sky-50 border border-sky-100">
                      <p className="text-2xl font-black text-sky-600">{callsCount}</p>
                      <p className="text-[10px] font-semibold text-[#807d72] uppercase tracking-wider mt-0.5">Appels</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <p className="text-2xl font-black text-violet-600">{emailsCount}</p>
                      <p className="text-[10px] font-semibold text-[#807d72] uppercase tracking-wider mt-0.5">Emails</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-2xl font-black text-emerald-600">{visitsCount}</p>
                      <p className="text-[10px] font-semibold text-[#807d72] uppercase tracking-wider mt-0.5">Visites</p>
                    </div>
                  </div>
                </div>

                {/* Next steps preview */}
                {pendingTasks.length > 0 && (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#059669]" />
                      <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Prochaines étapes</h3>
                    </div>
                    <div className="space-y-2">
                      {pendingTasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#fafaf8] border border-[#e5e5e0]">
                          <Clock className="h-3.5 w-3.5 text-[#807d72] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#26251e] truncate">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-[10px] text-[#807d72]">{formatDate(task.dueDate)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Livrables Tab ─── */}
              <TabsContent value="livrables" className="space-y-4">
                <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden">
                  {/* Add form */}
                  <div className="p-5 border-b border-[#e5e5e0] space-y-3 bg-[#fafaf8]">
                    <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-[#059669]" />
                      Ajouter un livrable
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Service (ex: Site web, SEO, Branding...)"
                        value={livrableForm.service}
                        onChange={(e) => setLivrableForm((f) => ({ ...f, service: e.target.value }))}
                        className="text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Description courte"
                        value={livrableForm.description}
                        onChange={(e) => setLivrableForm((f) => ({ ...f, description: e.target.value }))}
                        className="text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Prix (CAD)"
                        value={livrableForm.prix}
                        onChange={(e) => setLivrableForm((f) => ({ ...f, prix: e.target.value }))}
                        className="text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors"
                      />
                      <input
                        type="date"
                        value={livrableForm.dateLivraison}
                        onChange={(e) => setLivrableForm((f) => ({ ...f, dateLivraison: e.target.value }))}
                        className="text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors"
                      />
                    </div>
                    <button
                      onClick={addLivrable}
                      disabled={!livrableForm.service.trim()}
                      className="text-xs font-bold px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Ajouter le livrable
                    </button>
                  </div>

                  {/* Livrables table */}
                  {livrables.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <FileText className="h-8 w-8 text-[#807d72]/30 mx-auto" />
                      <p className="text-xs text-[#807d72]">Aucun livrable enregistré pour ce client.</p>
                      <p className="text-[10px] text-[#807d72]">Ajoutez les services livrés ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#fafaf9] border-b border-[#e5e5e0] text-[#807d72] text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-5 py-3">Service</th>
                            <th className="px-5 py-3">Description</th>
                            <th className="px-5 py-3">Date livraison</th>
                            <th className="px-5 py-3 text-right">Prix CAD</th>
                            <th className="px-4 py-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e0]/60">
                          {livrables.map((l) => (
                            <tr key={l.id} className="hover:bg-[#fafaf8] transition-colors">
                              <td className="px-5 py-3 font-semibold text-[#26251e]">{l.service}</td>
                              <td className="px-5 py-3 text-[#807d72]">{l.description || "—"}</td>
                              <td className="px-5 py-3 text-[#807d72]">{l.dateLivraison ? formatDate(l.dateLivraison) : "—"}</td>
                              <td className="px-5 py-3 text-right font-bold text-[#26251e]">
                                {l.prix > 0 ? `${l.prix.toLocaleString("fr-CA")} $` : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeLivrable(l.id)}
                                  className="p-1 text-[#807d72] hover:text-red-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {totalLivrables > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-[#e5e5e0] bg-[#f0fdf4]">
                              <td colSpan={3} className="px-5 py-3 text-xs font-bold text-[#059669] uppercase tracking-wider">
                                Total valeur livrée
                              </td>
                              <td className="px-5 py-3 text-right text-sm font-black text-[#059669]">
                                {totalLivrables.toLocaleString("fr-CA")} $
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── Historique Tab ─── */}
              <TabsContent value="historique" className="space-y-3">
                {clientNotes.length === 0 ? (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-10 text-center space-y-2">
                    <MessageSquare className="h-8 w-8 text-[#807d72]/30 mx-auto" />
                    <p className="text-xs font-semibold text-[#26251e]">Aucune interaction enregistrée</p>
                    <p className="text-[10px] text-[#807d72]">
                      Ajoutez des notes (appels, emails, visites) depuis la fiche lead.
                    </p>
                    <Link
                      href={`/leads/${selectedClient.id}`}
                      className="text-[10px] text-[#059669] hover:underline font-semibold"
                    >
                      Ouvrir la fiche lead →
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-[#e5e5e0]">
                      <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">
                        Toutes les interactions — {clientNotes.length} au total
                      </h3>
                    </div>
                    <div className="divide-y divide-[#e5e5e0]/60">
                      {[...clientNotes]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((note) => {
                          const cfg = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG.general;
                          const Icon = cfg.icon;
                          return (
                            <div key={note.id} className="flex gap-4 px-5 py-4 hover:bg-[#fafaf8] transition-colors">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] text-[#807d72] shrink-0">
                                    {formatDateLong(note.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-[#26251e] leading-relaxed">{note.content}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Prochaines étapes Tab ─── */}
              <TabsContent value="etapes" className="space-y-4">
                {/* Quick add */}
                <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-[#059669]" />
                    Ajouter une étape
                  </h3>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <input
                      type="text"
                      placeholder="Titre de l'étape..."
                      value={newStep.title}
                      onChange={(e) => setNewStep((s) => ({ ...s, title: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                      className="flex-1 text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors"
                    />
                    <input
                      type="date"
                      value={newStep.dueDate}
                      onChange={(e) => setNewStep((s) => ({ ...s, dueDate: e.target.value }))}
                      className="text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:border-[#059669] transition-colors w-full sm:w-40"
                    />
                    <button
                      onClick={handleAddStep}
                      disabled={!newStep.title.trim()}
                      className="text-xs font-bold px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                {/* Pending tasks */}
                {pendingTasks.length > 0 && (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e5e5e0] bg-[#fafaf8]">
                      <p className="text-[10px] font-bold text-[#26251e] uppercase tracking-wider">
                        En attente — {pendingTasks.length}
                      </p>
                    </div>
                    <div className="divide-y divide-[#e5e5e0]/60">
                      {pendingTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#26251e] truncate">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-[10px] text-[#807d72]">{formatDate(task.dueDate)}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                            À faire
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Done tasks */}
                {doneTasks.length > 0 && (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e5e5e0] bg-[#fafaf8]">
                      <p className="text-[10px] font-bold text-[#26251e] uppercase tracking-wider">
                        Terminées — {doneTasks.length}
                      </p>
                    </div>
                    <div className="divide-y divide-[#e5e5e0]/60">
                      {doneTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#26251e] truncate line-through">{task.title}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-[#059669] bg-[#059669]/10 border border-[#059669]/20 px-2 py-0.5 rounded-full shrink-0">
                            Fait ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {clientTasks.length === 0 && (
                  <div className="bg-white border border-[#e5e5e0] rounded-2xl p-10 text-center space-y-2">
                    <ClipboardList className="h-8 w-8 text-[#807d72]/30 mx-auto" />
                    <p className="text-xs font-semibold text-[#26251e]">Aucune étape planifiée</p>
                    <p className="text-[10px] text-[#807d72]">
                      Ajoutez des étapes ci-dessus pour organiser le suivi de ce client.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          aside, .print\\:hidden { display: none !important; }
          main { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
