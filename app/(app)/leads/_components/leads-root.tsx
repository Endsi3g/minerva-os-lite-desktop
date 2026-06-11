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
import { useReach } from '@/lib/reach-context';
import { columns } from '../columns';
import { DataTable } from '../data-table';
import { LeadsHeader } from './leads-header';
import { LeadsFilters } from './leads-filters';
import { LeadsEmptyState } from './leads-empty-state';
import { LeadsBulkActionsBar } from './leads-bulk-actions-bar';

export function LeadsRoot() {
  const { leads } = useReach();

  // Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Initialize TanStack Table
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

  const isFilteredEmpty = table.getRowModel().rows.length === 0;
  const isDatabaseEmpty = leads.length === 0;

  return (
    <div className="flex h-full flex-col gap-5 p-6 overflow-y-auto">
      {/* Header section */}
      <LeadsHeader />

      {/* Filters bar */}
      {!isDatabaseEmpty && <LeadsFilters table={table} />}

      {/* Main Table view */}
      {isDatabaseEmpty ? (
        <LeadsEmptyState 
          type="no-leads" 
          onAddLead={() => {
            // Trigger sheets opening in header or just trigger mock add
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
  );
}
export default LeadsRoot;
