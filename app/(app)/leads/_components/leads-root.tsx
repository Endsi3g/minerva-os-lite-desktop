'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { buildColumns } from '../columns';
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

  // Current authenticated user id (for "Assigné à moi" filter)
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  // Table states
  const [sorting, setSorting] = useState<SortingState>([{ id: 'intentScore', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Fetch current user id
  useEffect(() => {
    void createClient().auth.getUser().then((res: AuthResponse) => {
      if (res.data.user) setMyUserId(res.data.user.id);
    });
  }, []);

  // Fetch workspace members for the assignment dropdown
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    const ownerParam = activeWorkspace.owner_id
      ? `?ownerUserId=${activeWorkspace.owner_id}`
      : '';
    try {
      const res = await fetch(getApiUrl(`/api/team/members${ownerParam}`));
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(data.members || []);
      }
    } catch {}
  }, [activeWorkspace]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Apply "Assigné à moi" pre-filter
  const visibleLeads =
    showAssignedToMe && myUserId
      ? leads.filter(l => l.assignedTo === myUserId)
      : leads;

  const columns = buildColumns(workspaceMembers);

  // Initialize TanStack Table
  const table = useReactTable({
    data: visibleLeads,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const isFilteredEmpty = table.getRowModel().rows.length === 0;
  const isDatabaseEmpty = leads.length === 0;

  return (
    <div className="flex h-full flex-col gap-5 p-6 overflow-y-auto bg-white relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20" />
      <div className="flex flex-col gap-5 relative z-10 flex-1">
        {/* Header section */}
        <LeadsHeader />

        {/* Filters bar */}
        {!isDatabaseEmpty && (
          <LeadsFilters
            table={table}
            showAssignedToMe={showAssignedToMe}
            onToggleAssignedToMe={() => setShowAssignedToMe(v => !v)}
          />
        )}

        {/* Main Table view */}
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

        {/* Floating Bulk Actions bar */}
        <LeadsBulkActionsBar table={table} />
      </div>
    </div>
  );
}
export default LeadsRoot;
