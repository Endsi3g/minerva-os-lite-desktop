"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileText, Globe, Loader2, Lock } from "lucide-react";
import { format } from "date-fns";

interface DocumentRow {
  id: string;
  title: string;
  type: "markdown" | "pdf" | "docx" | "blank";
  content: string | null;
  folder_name: string | null;
  updated_at: string;
}

export default function SharedDocumentClient() {
  const params = useParams();
  const docId = typeof params?.id === "string" ? params.id : "";

  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    const fetchDoc = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, type, content, folder_name, updated_at, is_shared")
          .eq("id", docId)
          .single();

        if (error) {
          throw error;
        }

        if (!data.is_shared) {
          setError("Ce document n'est pas partagé publiquement.");
          return;
        }

        setDocument(data as DocumentRow);
      } catch (err: any) {
        console.error("Error fetching shared document:", err);
        setError("Impossible de charger le document partagé. Il a peut-être été supprimé ou son accès a été révoqué.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docId]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#26251e] font-sans selection:bg-[#10b981]/10 flex flex-col">
      
      {/* Public Header */}
      <header className="border-b border-[#e5e5e0] bg-white py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                {document ? document.title : "Document Partagé"}
              </h1>
              {document?.folder_name && (
                <p className="text-[10px] text-[#807d72] font-semibold mt-0.5">Dossier : {document.folder_name}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#10b981]/15 text-[#059669] px-2.5 py-1 rounded-full flex items-center gap-1 border border-[#10b981]/25 select-none">
            <Globe className="w-3 h-3 animate-pulse" /> Document Public
          </span>
        </div>
      </header>

      {/* Main content body */}
      <main className="max-w-4xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col justify-start">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 flex-1">
            <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            <p className="text-xs text-[#807d72]">Chargement du document partagé...</p>
          </div>
        )}

        {error && (
          <div className="border border-dashed border-[#e5e5e0] bg-white rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 text-center my-auto">
            <Lock className="w-10 h-10 text-red-500" />
            <h3 className="font-bold text-sm text-[#26251e]">Accès Restreint</h3>
            <p className="text-xs text-[#807d72] max-w-xs leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {document && !loading && !error && (
          <article className="bg-white border border-[#e5e5e0] rounded-2xl p-8 shadow-xs flex-1 flex flex-col text-left">
            {/* Meta details */}
            <div className="flex items-center justify-between text-[10px] text-[#807d72] font-bold uppercase tracking-wider pb-4 border-b border-[#e5e5e0] mb-6">
              <span>Type: {document.type}</span>
              <span>
                Mis à jour le : {format(new Date(document.updated_at), "dd/MM/yyyy 'à' HH:mm")}
              </span>
            </div>

            {/* Document body rendered safely */}
            <div className="prose prose-sm max-w-none text-xs leading-relaxed flex-1 selection:bg-[#10b981]/15">
              {document.content ? (
                document.type === "markdown" || document.type === "blank" ? (
                  <div dangerouslySetInnerHTML={{ __html: document.content }} />
                ) : (
                  <p className="text-[#807d72] italic">
                    Aperçu brut non disponible pour ce type de fichier.
                  </p>
                )
              ) : (
                <p className="text-[#807d72] italic">Ce document ne contient pas de texte.</p>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
