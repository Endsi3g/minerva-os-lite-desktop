'use client';

import React, { useState, useEffect } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { Lead } from '@/lib/mock-data';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

interface LeadsAssignCellProps {
  lead: Lead;
  workspaceMembers: WorkspaceMember[];
}

export function LeadsAssignCell({ lead, workspaceMembers }: LeadsAssignCellProps) {
  const { updateLead } = useReach();
  const [open, setOpen] = useState(false);

  const active = workspaceMembers.filter(m => m.member_user_id);
  const assignedMember = lead.assignedTo
    ? active.find(m => m.member_user_id === lead.assignedTo)
    : null;

  const displayName = (m: WorkspaceMember) =>
    m.profile?.full_name || m.email.split('@')[0];

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={[
          'flex items-center gap-1.5 text-[11px] font-semibold transition-colors px-2 py-1 rounded-md',
          assignedMember
            ? 'bg-[#f54e00]/8 text-[#f54e00] hover:bg-[#f54e00]/15'
            : 'text-neutral-400 hover:text-[#f54e00] hover:bg-neutral-100',
        ].join(' ')}
      >
        {assignedMember ? (
          <>
            <div className="w-4 h-4 rounded-full bg-[#26251e] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
              {displayName(assignedMember).charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[80px]">{displayName(assignedMember)}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Assigner</span>
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-[90] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 min-w-[180px] max-h-52 overflow-y-auto">
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 mb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Assigner à</span>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-3 h-3" />
              </button>
            </div>
            {/* Unassign option */}
            <button
              className="w-full px-3 py-1.5 text-[11px] text-left text-neutral-500 hover:bg-neutral-50 flex items-center justify-between"
              onClick={() => { updateLead(lead.id, { assignedTo: undefined }); setOpen(false); }}
            >
              <span>Non assigné</span>
              {!lead.assignedTo && <Check className="w-3 h-3 text-[#059669]" />}
            </button>
            {active.map(m => {
              const name = displayName(m);
              const isAssigned = lead.assignedTo === m.member_user_id;
              return (
                <button
                  key={m.id}
                  className="w-full px-3 py-1.5 text-[11px] text-left hover:bg-neutral-50 flex items-center justify-between gap-2"
                  onClick={() => { updateLead(lead.id, { assignedTo: m.member_user_id! }); setOpen(false); }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-[#26251e] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-800 truncate">{name}</p>
                      <p className="text-[9px] text-neutral-400 truncate">{m.email}</p>
                    </div>
                  </div>
                  {isAssigned && <Check className="w-3 h-3 text-[#059669] shrink-0" />}
                </button>
              );
            })}
            {active.length === 0 && (
              <div className="px-3 py-3 text-[11px] text-neutral-400 text-center">
                Aucun membre actif dans ce workspace
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
