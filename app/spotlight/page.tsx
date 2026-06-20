'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SpotlightLead {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  niche: string;
  city: string;
  status: string;
}

export default function SpotlightPage() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<SpotlightLead[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Fetch leads based on search query
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const supabase = createClient();
        let data;
        if (!query.trim()) {
          // Show recent leads
          const res = await supabase
            .from('leads')
            .select('id, business_name, contact_name, contact_email, niche, city, status')
            .order('updated_at', { ascending: false })
            .limit(5);
          data = res.data;
        } else {
          const res = await supabase
            .from('leads')
            .select('id, business_name, contact_name, contact_email, niche, city, status')
            .or(`business_name.ilike.%${query}%,niche.ilike.%${query}%,city.ilike.%${query}%`)
            .limit(6);
          data = res.data;
        }
        setLeads((data || []) as unknown as SpotlightLead[]);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Failed to query Supabase leads in Spotlight:", err);
      }
    };

    fetchLeads();
  }, [query]);

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const electronObj = (window as any).electron;
    if (!electronObj) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < leads.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      electronObj.hideSpotlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (leads.length === 0) return;
      const selectedLead = leads[selectedIndex];
      
      if (e.shiftKey) {
        // Shift + Enter: Open in main window
        electronObj.openLeadInMain(selectedLead.id);
      } else {
        // Enter: Copy contact email (or business name if no email)
        const textToCopy = selectedLead.contact_email || selectedLead.business_name;
        electronObj.copyToClipboard(textToCopy);
        electronObj.sendNotification('Copié dans le presse-papiers', `${textToCopy} a été copié avec succès.`);
        electronObj.hideSpotlight();
      }
    }
  };

  return (
    <div 
      onKeyDown={handleKeyDown}
      className="w-full h-screen bg-[#f4f4f3]/95 backdrop-blur-md border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans text-[#26251e] select-none"
    >
      {/* Search Input Bar */}
      <div className="flex items-center px-4 py-3 border-b border-[#e5e5e0] bg-white/70">
        <Search className="w-5 h-5 text-[#7a7a76] shrink-0 mr-3" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher des prospects par nom, niche ou ville..."
          className="w-full text-sm font-medium focus:outline-none bg-transparent placeholder-[#7a7a76]"
        />
        <div className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider bg-[#e5e5e2] px-2 py-0.5 rounded border border-[#d6d6d0]">
          Spotlight
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {leads.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#7a7a76] font-medium">
            Aucun prospect trouvé
          </div>
        ) : (
          leads.map((lead, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedIndex(idx)}
                onDoubleClick={() => {
                  const electronObj = (window as any).electron;
                  if (electronObj) {
                    electronObj.openLeadInMain(lead.id);
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-[#059669] text-white shadow-sm' 
                    : 'hover:bg-white/50 text-[#26251e]'
                }`}
              >
                <div className="flex flex-col text-left min-w-0 max-w-[70%]">
                  <span className="font-bold text-xs truncate leading-normal">{lead.business_name}</span>
                  <span className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-[#7a7a76]'}`}>
                    {lead.niche} · {lead.city}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {lead.contact_email && (
                    <Mail className={`w-3.5 h-3.5 ${isSelected ? 'text-white/80' : 'text-[#7a7a76]'}`} />
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isSelected 
                      ? 'bg-white/20 text-white border border-white/10' 
                      : 'bg-[#e5e5e2] text-[#555552] border border-[#d6d6d0]'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Hotkeys Instructions */}
      <div className="px-4 py-2 border-t border-[#e5e5e0] bg-[#f4f4f3]/50 flex items-center justify-between text-[10px] text-[#7a7a76] font-semibold">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="bg-white border border-[#e5e5e0] rounded px-1 text-[9px] shadow-2xs">Entrée</span> Copier l'email
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-white border border-[#e5e5e0] rounded px-1 text-[9px] shadow-2xs">Shift+Entrée</span> Ouvrir la fiche
          </span>
        </div>
        <span className="flex items-center gap-1">
          <span className="bg-white border border-[#e5e5e0] rounded px-1 text-[9px] shadow-2xs">Échap</span> Fermer
        </span>
      </div>
    </div>
  );
}
