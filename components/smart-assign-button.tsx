'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface TeamMember {
  userId: string;
  name: string;
}

export function SmartAssignButton({
  actionId,
  workspaceId,
  currentAssignee,
}: {
  actionId: string;
  workspaceId: string;
  currentAssignee?: string;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigned, setAssigned] = useState<string | undefined>(currentAssignee);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || members.length) return;
    fetch(getApiUrl('/api/team/members'))
      .then(r => r.json())
      .then(d => {
        setMembers(
          (d.members ?? []).map((m: { member_user_id: string; profile?: { full_name?: string } | null }) => ({
            userId: m.member_user_id,
            name: m.profile?.full_name ?? 'Membre',
          }))
        );
      })
      .catch(() => {});
  }, [open, members.length]);

  const handleAssign = async (userId: string, name: string) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/nba/assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          assignee_user_id: userId,
          workspace_id: workspaceId,
        }),
      });
      if (!res.ok) throw new Error();
      setAssigned(userId);
      setOpen(false);
      toast.success(`Action assignée à ${name}`);
    } catch {
      toast.error("Erreur lors de l'assignation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] font-semibold text-[#7a7a76] hover:text-[#059669] transition-colors px-2 py-1 rounded border border-[#e5e5e0] hover:border-[#059669]/30 bg-white">
          <UserPlus className="h-3 w-3" />
          {assigned ? 'Réassigner' : 'Assigner'}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-1 bg-white border border-[#e5e5e0] rounded-xl shadow-lg"
        align="end"
      >
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] px-2 py-1">
          Assigner à
        </p>
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7a7a76]" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-[10px] text-[#7a7a76] px-2 py-1">Aucun membre</p>
        ) : (
          members.map(m => (
            <button
              key={m.userId}
              onClick={() => handleAssign(m.userId, m.name)}
              className={cn(
                'w-full text-left px-2 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between gap-1 hover:bg-[#f4f4f3] transition-colors',
                assigned === m.userId ? 'text-[#059669]' : 'text-[#26251e]'
              )}
            >
              <span className="truncate">{m.name}</span>
              {assigned === m.userId && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
