'use client';

import React, { useState } from 'react';
import { Table as TableType } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useReach } from '@/lib/reach-context';
import { Trash2, X, Sparkles, Loader2 } from 'lucide-react';
import { Lead } from '@/lib/mock-data';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface LeadsBulkActionsBarProps<TData> {
  table: TableType<TData>;
}

export function LeadsBulkActionsBar<TData>({ table }: LeadsBulkActionsBarProps<TData>) {
  const { deleteLeads, updateLeadsStatus, activeWorkspace } = useReach();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const isVisible = selectedCount > 0;

  if (!isVisible) return null;

  const selectedIds = selectedRows.map((row) => (row.original as Lead).id);

  const handleStatusChange = (status: Lead['status']) => {
    updateLeadsStatus(selectedIds, status);
    table.toggleAllPageRowsSelected(false);
  };

  const handleConfirmDelete = () => {
    deleteLeads(selectedIds);
    table.toggleAllPageRowsSelected(false);
    setShowDeleteDialog(false);
  };

  const handleGenerateDrafts = async () => {
    if (!activeWorkspace?.id || generatingDrafts) return;
    setGeneratingDrafts(true);
    try {
      const res = await fetch(getApiUrl('/api/outreach/batch-generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds, workspaceId: activeWorkspace.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      const failedCount = data.failed?.length ?? 0;
      if (data.created > 0) {
        toast.success(`${data.created} brouillon${data.created > 1 ? 's' : ''} généré${data.created > 1 ? 's' : ''} — à approuver dans Outreach.${failedCount ? ` (${failedCount} échec${failedCount > 1 ? 's' : ''})` : ''}`);
      } else {
        toast.error("Aucun brouillon n'a pu être généré pour cette sélection.");
      }
      table.toggleAllPageRowsSelected(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération des brouillons');
    } finally {
      setGeneratingDrafts(false);
    }
  };

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedCount} prospect{selectedCount > 1 ? 's' : ''} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les {selectedCount} prospect{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''} seront définitivement supprimé{selectedCount > 1 ? 's' : ''} de ton portefeuille.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Supprimer {selectedCount > 1 ? `les ${selectedCount}` : 'le prospect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#e5e5e0] shadow-xl rounded-lg px-4 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Count Info */}
        <div className="flex items-center gap-2 border-r border-[#e5e5e0] pr-4 text-xs font-semibold text-[#26251e]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#059669] text-white text-[10px] font-bold">
            {selectedCount}
          </span>
          <span>sélectionné{selectedCount > 1 ? 's' : ''}</span>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-3">
          {/* Bulk Status Dropdown */}
          <Select onValueChange={(val: Lead['status']) => handleStatusChange(val)}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-[#fafaf8]">
              <SelectValue placeholder="Changer le statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New" className="text-xs">🔴 Nouveau</SelectItem>
              <SelectItem value="Contacted" className="text-xs">🟡 Contacté</SelectItem>
              <SelectItem value="Meeting Booked" className="text-xs">🟣 RDV Fixé</SelectItem>
              <SelectItem value="Proposal Sent" className="text-xs">🟪 Proposition envoyée</SelectItem>
              <SelectItem value="Negotiation" className="text-xs">🟠 Négociation</SelectItem>
              <SelectItem value="Won" className="text-xs">🟢 Gagné</SelectItem>
              <SelectItem value="Lost" className="text-xs">⚪ Perdu</SelectItem>
            </SelectContent>
          </Select>

          {/* Bulk AI Draft Generation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateDrafts}
            disabled={generatingDrafts}
            className="h-8 px-2.5 text-xs text-[#059669] hover:text-[#047857] hover:bg-[#059669]/5 gap-1.5"
          >
            {generatingDrafts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Générer brouillons IA</span>
          </Button>

          {/* Bulk Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Supprimer</span>
          </Button>

          {/* Clear Selection Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.toggleAllPageRowsSelected(false)}
            className="h-8 w-8 p-0 text-[#7a7a76] hover:text-[#26251e]"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Annuler</span>
          </Button>
        </div>
      </div>
    </>
  );
}
export default LeadsBulkActionsBar;
