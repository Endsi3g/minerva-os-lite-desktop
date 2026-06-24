'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import type { AuthResponse } from '@supabase/supabase-js';
import { getApiUrl } from '@/lib/api-helper';
import { Lead } from '@/lib/mock-data';
import { buildColumns } from '../columns';
import { TEAM_ASSIGN_VALUE } from './leads-assign-cell';
import { DataTable } from '../data-table';
import { LeadsHeader } from './leads-header';
import { LeadsFilters } from './leads-filters';
import { LeadsEmptyState } from './leads-empty-state';
import { LeadsBulkActionsBar } from './leads-bulk-actions-bar';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

export function LeadsRoot() {
  const { leads, activeWorkspace } = useReach();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);
  // Cross-workspace leads assigned to the current user
  const [crossLeads, setCrossLeads] = useState<Lead[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'intentScore', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Fetch current user
  useEffect(() => {
    void createClient().auth.getUser().then((res: AuthResponse) => {
      if (res.data.user) setMyUserId(res.data.user.id);
    });
  }, []);

  // Fetch workspace members for assignment dropdown
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    const ownerParam = activeWorkspace.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
    try {
      const res = await fetch(getApiUrl(`/api/team/members${ownerParam}`));
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(data.members || []);
      }
    } catch {}
  }, [activeWorkspace]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Fetch cross-workspace leads when "Mes leads" filter is active
  const fetchCrossLeads = useCallback(async () => {
    if (!showAssignedToMe) { setCrossLeads([]); return; }
    try {
      const res = await fetch(getApiUrl('/api/leads/assigned'));
      if (res.ok) {
        const data = await res.json();
        setCrossLeads(data.leads || []);
      }
    } catch {}
  }, [showAssignedToMe]);

  useEffect(() => { fetchCrossLeads(); }, [fetchCrossLeads]);

  const [lastVisitedLeadId, setLastVisitedLeadId] = useState<string | null>(null);
  useEffect(() => {
    setLastVisitedLeadId(localStorage.getItem('minerva_last_visited_lead_id'));
  }, []);

  // "Mes leads" mode: merge current workspace leads + cross-workspace assigned leads, deduplicated
  const baseLeads = useMemo<Lead[]>(() => {
    if (!showAssignedToMe || !myUserId) return leads;
    const wsMatches = leads.filter(
      l => l.assignedTo === myUserId || l.assignedTo === TEAM_ASSIGN_VALUE
    );
    const wsIds = new Set(wsMatches.map(l => l.id));
    const crossOnly = crossLeads.filter(l => !wsIds.has(l.id));
    return [...wsMatches, ...crossOnly];
  }, [leads, showAssignedToMe, myUserId, crossLeads]);

  // Put last visited lead first — memoized so TanStack Table never sees an unstable data reference
  const visibleLeads = useMemo<Lead[]>(() => {
    if (!lastVisitedLeadId) return baseLeads;
    const idx = baseLeads.findIndex(l => l.id === lastVisitedLeadId);
    if (idx <= 0) return baseLeads;
    const reordered = [...baseLeads];
    const [visited] = reordered.splice(idx, 1);
    return [visited, ...reordered];
  }, [baseLeads, lastVisitedLeadId]);

  // Memoized so TanStack Table never receives new column-def references on every render
  const columns = useMemo(
    () => buildColumns(workspaceMembers, lastVisitedLeadId),
    [workspaceMembers, lastVisitedLeadId]
  );

  const table = useReactTable({
    data: visibleLeads,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const isFilteredEmpty = table.getRowModel().rows.length === 0;
  // In "Mes leads" mode, empty state checks the merged list; otherwise the workspace list
  const isDatabaseEmpty = !showAssignedToMe && leads.length === 0;

  return (
    <div className="flex h-full flex-col gap-5 p-6 overflow-y-auto bg-white relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20" />
      <div className="flex flex-col gap-5 relative z-10 flex-1">
        <LeadsHeader />

        <LeadsFilters
          table={table}
          showAssignedToMe={showAssignedToMe}
          onToggleAssignedToMe={() => setShowAssignedToMe(v => !v)}
        />

        {isDatabaseEmpty ? (
          <LeadsEmptyState
            type="no-leads"
            onAddLead={() => {
              const sheetTrigger = document.querySelector('[aria-haspopup="dialog"]') as HTMLElement;
              if (sheetTrigger) sheetTrigger.click();
            }}
          />
        ) : isFilteredEmpty ? (
          <LeadsEmptyState
            type="no-results"
            onResetFilters={() => {
              setGlobalFilter('');
              setColumnFilters([]);
              setShowAssignedToMe(false);
              table.setGlobalFilter('');
              table.getColumn('status')?.setFilterValue(undefined);
              table.getColumn('temperature')?.setFilterValue(undefined);
              table.getColumn('niche')?.setFilterValue(undefined);
            }}
          />
        ) : (
          <DataTable columns={columns} table={table} />
        )}

        <LeadsBulkActionsBar table={table} />
      </div>
    </div>
  );
}
export default LeadsRoot;
