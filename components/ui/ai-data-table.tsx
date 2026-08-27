'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, ExternalLink, ArrowUpDown, Table as TableIcon } from 'lucide-react';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';
import { cn } from '@/lib/utils';

export interface AIDataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface AIDataTableData {
  title?: string;
  columns?: AIDataTableColumn[];
  rows: Array<Record<string, any>>;
}

interface AIDataTableProps {
  data: AIDataTableData;
  onRowClick?: (row: Record<string, any>) => void;
}

export function AIDataTable({ data, onRowClick }: AIDataTableProps) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = data.rows || [];
  const columns: AIDataTableColumn[] = data.columns || (
    rows.length > 0
      ? Object.keys(rows[0]).map((k) => ({ key: k, label: k.replace(/_/g, ' '), sortable: true }))
      : []
  );

  const filteredRows = rows.filter((r) =>
    Object.values(r).some((val) =>
      String(val || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = aVal > bVal ? 1 : -1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = columns.map((c) => c.label).join(',');
    const csvLines = rows.map((r) =>
      columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...csvLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.title || 'donnees'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-xs rounded-xl overflow-hidden my-3">
      <CardHeader className="p-3.5 border-b border-[#e5e5e0]/60 bg-neutral-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#059669]/10 flex items-center justify-center text-[#059669]">
              <TableIcon className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-xs font-bold text-[#14171A] font-heading font-sans uppercase tracking-wider">
              {data.title || 'Tableau de Données'} ({sortedRows.length})
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-40 sm:w-48">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#8A9098]" />
              <Input
                placeholder="Filtrer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs pl-7 bg-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-7 text-[10px] font-semibold px-2"
              title="Exporter en CSV"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader className="bg-neutral-50 sticky top-0 z-10 border-b border-[#e5e5e0]">
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={cn(
                      'text-[10px] font-bold text-[#4B5158] uppercase tracking-wider h-8 select-none py-1',
                      col.sortable !== false && 'cursor-pointer hover:text-[#059669]'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {col.sortable !== false && <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-6 text-xs text-[#7a7a76]">
                    Aucune ligne trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row, idx) => (
                  <TableRow
                    key={row.id || idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'border-b border-[#e5e5e0]/60 hover:bg-neutral-50/70 transition-colors text-xs',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => {
                      const val = row[col.key];
                      if (col.key === 'temperature' && val) {
                        return (
                          <TableCell key={col.key} className="py-2">
                            <Badge variant="secondary" className={cn('text-[8px] font-bold px-1.5 py-0 rounded', getTemperatureStyle(val))}>
                              {getTemperatureLabel(val)}
                            </Badge>
                          </TableCell>
                        );
                      }
                      if (col.key === 'businessName' || col.key === 'business_name') {
                        return (
                          <TableCell key={col.key} className="py-2 font-bold text-[#14171A]">
                            {row.id ? (
                              <Link href={`/leads/${row.id}`} className="hover:text-[#059669] transition-colors">
                                {val}
                              </Link>
                            ) : (
                              val
                            )}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={col.key} className="py-2 text-[#4B5158]">
                          {typeof val === 'number' && col.key.toLowerCase().includes('amount')
                            ? val.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
                            : String(val ?? '—')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIDataTable;
