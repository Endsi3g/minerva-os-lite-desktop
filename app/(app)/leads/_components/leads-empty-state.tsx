'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, SearchX, Plus } from 'lucide-react';

interface LeadsEmptyStateProps {
  type: 'no-leads' | 'no-results';
  onResetFilters?: () => void;
  onAddLead?: () => void;
}

export function LeadsEmptyState({ type, onResetFilters, onAddLead }: LeadsEmptyStateProps) {
  return (
    <Card className="border border-dashed border-border bg-card/40 py-16">
      <CardContent className="flex flex-col items-center justify-center text-center p-6">
        {type === 'no-results' ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground mb-4">
              <SearchX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Aucun résultat trouvé</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              Aucun prospect ne correspond à tes critères de recherche ou aux filtres actifs.
            </p>
            {onResetFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResetFilters}
                className="mt-5 text-xs h-8"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Portefeuille de prospects vide</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              Commence à ajouter tes prospects manuellement ou importe un fichier CSV pour initier ton pipeline de prospection.
            </p>
            {onAddLead && (
              <Button 
                size="sm" 
                onClick={onAddLead}
                className="mt-5 text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter ton premier lead</span>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
export default LeadsEmptyState;
