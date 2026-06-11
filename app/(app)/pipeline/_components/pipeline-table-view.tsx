'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Lead } from '@/lib/mock-data';
import { columns } from '../../leads/columns';
import { DataTable } from '../../leads/data-table';
import { LeadsBulkActionsBar } from '../../leads/_components/leads-bulk-actions-bar';

interface PipelineTableViewProps {
  leads: Lead[];
}

export function PipelineTableView({ leads }: PipelineTableViewProps) {
  // Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Initialize TanStack Table with the filtered leads dataset passed from PipelineRoot
  const table = useReactTable({
    data: leads,
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

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Renders standard table list */}
      <DataTable columns={columns} table={table} />

      {/* Floating Bulk Actions bar (triggers on multiple lead selections) */}
      <LeadsBulkActionsBar table={table} />
    </div>
  );
}

export default PipelineTableView;
