'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  Table as TableType
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  table: TableType<TData>;
}

export function DataTable<TData>({
  columns,
  table,
}: DataTableProps<TData>) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {/* Table Card Grid */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') || 
                      target.closest('a') || 
                      target.closest('input') || 
                      target.closest('[role="checkbox"]')
                    ) {
                      return;
                    }
                    const lead = row.original as { id?: string };
                    if (lead?.id) {
                      router.push(`/leads/${lead.id}`);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-4 text-xs font-medium align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  Aucun prospect correspondant aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 text-xs">
        {/* Selection count */}
        <div className="flex-1 text-[11px] text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} sur{' '}
          {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s).
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span>Page</span>
            <span className="font-semibold text-foreground">
              {table.getState().pagination.pageIndex + 1}
            </span>
            <span>sur</span>
            <span className="font-semibold text-foreground">
              {table.getPageCount() || 1}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Aller à la première page</span>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Page précédente</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Page suivante</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Aller à la dernière page</span>
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default DataTable;
