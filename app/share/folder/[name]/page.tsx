"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FolderIcon, FileText, FileSpreadsheet, FileCode, Lock, Globe, Loader2, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentRow {
  id: string;
  title: string;
  type: "markdown" | "pdf" | "docx" | "blank";
  content: string | null;
  folder_name: string | null;
  updated_at: string;
}

const formatRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
};

const getFileIcon = (type: DocumentRow["type"]) => {
  if (type === "pdf") return FileText;
  if (type === "docx") return FileSpreadsheet;
  return FileCode;
};

export default function SharedFolderPage() {
  const params = useParams();
  const folderName = typeof params?.name === "string" ? decodeURIComponent(params.name) : "";

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);

  useEffect(() => {
    if (!folderName) return;
    const fetchSharedDocs = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, type, content, folder_name, updated_at")
          .eq("folder_name", folderName)
          .eq("is_shared", true)
          .order("updated_at", { ascending: false });

        if (!error && data) {
          setDocuments(data as DocumentRow[]);
        }
      } catch (err) {
        console.error("Error fetching shared documents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSharedDocs();
  }, [folderName]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#26251e] font-sans selection:bg-[#10b981]/10">
      
      {/* Public Header */}
      <header className="border-b border-[#e5e5e0] bg-white py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
              <FolderIcon className="w-5 h-5 fill-[#10b981]/10" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Dossier Partagé</h1>
              <p className="text-xs text-[#807d72] font-semibold mt-0.5">{folderName}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#10b981]/15 text-[#059669] px-2.5 py-1 rounded-full flex items-center gap-1 border border-[#10b981]/25 select-none">
            <Globe className="w-3 h-3 animate-pulse" /> Public
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            <p className="text-xs text-[#807d72]">Chargement des documents partagés...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-[#e5e5e0] bg-white rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 text-center">
            <FolderIcon className="w-10 h-10 text-[#807d72]/40" />
            <h3 className="font-bold text-sm text-[#26251e]">Aucun document visible</h3>
            <p className="text-xs text-[#807d72] max-w-xs leading-relaxed">
              Ce dossier est public mais ne contient aucun document marqué comme partagé pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.type);
              const previewText = doc.content
                ? doc.content.replace(/[#*`_\[\]]/g, "").trim().slice(0, 100)
                : "";

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="border border-[#e5e5e0] hover:border-[#10b981]/50 rounded-2xl overflow-hidden bg-white hover:shadow-md cursor-pointer transition-all flex flex-col p-5 space-y-4 group relative text-left"
                >
                  <div className="aspect-[4/3] bg-[#fafaf9] border border-[#e5e5e0] rounded-xl p-3 flex flex-col justify-start overflow-hidden relative">
                    {previewText ? (
                      <p className="text-[9px] text-[#807d72] leading-relaxed line-clamp-6 select-none">
                        {previewText}
                      </p>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon className="w-8 h-8 text-[#10b981]" />
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-white/95 border border-[#e5e5e0] px-2 py-0.5 rounded text-[9px] font-bold text-[#10b981] flex items-center gap-1 transition-opacity">
                      <Eye className="w-3 h-3" /> Prévisualiser
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-[#807d72] font-semibold">
                      Mis à jour {formatRelativeTime(doc.updated_at)}
                    </p>
                    <h3 className="text-xs font-bold text-[#26251e] truncate group-hover:text-[#10b981] transition-colors">
                      {doc.title}
                    </h3>
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-[#807d72]">
                      {doc.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Doc Preview modal Overlay */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-[#e5e5e0] rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="border-b border-[#e5e5e0] bg-[#fafaf9] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">
                  Lecture seule
                </span>
                <h3 className="font-bold text-sm text-[#26251e] mt-1">{selectedDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-left prose prose-sm max-w-none text-xs leading-relaxed selection:bg-[#10b981]/15">
              {selectedDoc.content ? (
                selectedDoc.type === "markdown" || selectedDoc.type === "blank" ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedDoc.content }} />
                ) : (
                  <p className="text-[#807d72] italic">
                    Aperçu non disponible en format brut pour ce document.
                  </p>
                )
              ) : (
                <p className="text-[#807d72] italic">Document vide.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
