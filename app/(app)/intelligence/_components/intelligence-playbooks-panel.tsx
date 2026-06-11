'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Copy, Check, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Playbook {
  id: string;
  title: string;
  description: string;
  channel: 'Email' | 'SMS' | 'DM';
  subject?: string;
  bodyTemplate: string;
}

export function IntelligencePlaybooksPanel() {
  const { leads } = useReach();
  const [activeTab, setActiveTab] = useState<'cold' | 'followup' | 'offers'>('cold');
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [targetLeadId, setTargetLeadId] = useState<string>('');
  const [customizedBody, setCustomizedBody] = useState<string>('');
  const [customizedSubject, setCustomizedSubject] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const playbooks: Record<string, Playbook[]> = {
    cold: [
      {
        id: 'pb-cold-1',
        title: 'Audit de Visibilité Offert',
        description: 'Idéal pour les prospects ayant un faible score SEO ou une fiche Maps non revendiquée.',
        channel: 'Email',
        subject: 'Audit de visibilité locale gratuit pour [Business]',
        bodyTemplate: 'Bonjour [Nom],\n\nJ\'ai analysé la visibilité locale de [Business] à [Ville]. J\'ai remarqué que votre fiche Maps n\'a pas été revendiquée, ce qui vous fait perdre de nombreux clients face à vos concurrents directs.\n\nJ\'ai préparé un mini-audit SEO gratuit pour vous montrer comment corriger cela. Seriez-vous disponible pour un appel de 5 minutes cette semaine ?\n\nCordialement,\n[Moi]'
      },
      {
        id: 'pb-cold-2',
        title: 'Accroche Instagram DM',
        description: 'Pour les commerces très actifs sur les réseaux mais sans site web convertible.',
        channel: 'DM',
        bodyTemplate: 'Hello [Nom] ! J\'adore les photos de vos créations chez [Business] 😍.\nJe bossais sur la visibilité des commerces à [Ville] et j\'ai vu que vous n\'aviez pas de site de réservation directe sur votre profil. C\'est quelque chose que vous aimeriez simplifier ?\nBonne journée !'
      }
    ],
    followup: [
      {
        id: 'pb-follow-1',
        title: 'Relance confirmation de démonstration',
        description: 'À envoyer 24-48h après une première visite physique ou appel resté sans réponse.',
        channel: 'SMS',
        bodyTemplate: 'Bonjour [Nom], c\'est [Moi] de Minerva. Avez-vous pu regarder ma proposition de créneau pour notre démonstration de vendredi concernant [Business] ? Bonne journée !'
      },
      {
        id: 'pb-follow-2',
        title: 'Suivi après envoi de brochure',
        description: 'Pour ré-engager un prospect après lui avoir partagé la documentation commerciale.',
        channel: 'Email',
        subject: 'Suite à notre échange - Documentation Minerva Reach',
        bodyTemplate: 'Bonjour [Nom],\n\nJe me permets de vous relancer concernant la brochure Minerva que je vous ai envoyée en début de semaine.\n\nAvez-vous eu le temps d\'y jeter un coup d\'œil ? J\'aimerais beaucoup avoir votre avis par rapport aux besoins de [Business].\n\nExcellente journée,\n[Moi]'
      }
    ],
    offers: [
      {
        id: 'pb-offer-1',
        title: 'Offre Partenaire Local',
        description: 'Une promotion exclusive réservée aux commerçants pionniers d\'un secteur.',
        channel: 'Email',
        subject: 'Partenaire Local Minerva Reach - [Ville]',
        bodyTemplate: 'Bonjour [Nom],\n\nSuite à notre premier contact concernant [Business], nous venons de lancer notre programme "Partenaire Local" à [Ville].\n\nNous offrons aux 3 premiers commerces inscrits un accompagnement digital complet Minerva Reach gratuit pendant 2 mois.\n\nIntéressé(e) par les détails ?\n\nBonne journée,\n[Moi]'
      }
    ]
  };

  const handleUsePlaybook = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
    const defaultLead = leads[0]?.id || '';
    setTargetLeadId(defaultLead);
    
    if (leads[0]) {
      parametrizeDraft(playbook, leads[0]);
    } else {
      setCustomizedBody(playbook.bodyTemplate);
      setCustomizedSubject(playbook.subject || '');
    }
  };

  const parametrizeDraft = (playbook: Playbook, lead: Lead) => {
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/\[Nom\]/g, lead.contactName || 'Monsieur/Madame')
        .replace(/\[Business\]/g, lead.businessName)
        .replace(/\[Ville\]/g, lead.city)
        .replace(/\[Moi\]/g, lead.owner || 'Moi');
    };

    setCustomizedBody(replacePlaceholders(playbook.bodyTemplate));
    setCustomizedSubject(playbook.subject ? replacePlaceholders(playbook.subject) : '');
  };

  const handleLeadChange = (leadId: string) => {
    setTargetLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead && selectedPlaybook) {
      parametrizeDraft(selectedPlaybook, lead);
    }
  };

  const handleCopy = () => {
    const fullText = selectedPlaybook?.channel === 'Email' 
      ? `Objet : ${customizedSubject}\n\n${customizedBody}`
      : customizedBody;
      
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getChannelBadge = (channel: Playbook['channel']) => {
    switch (channel) {
      case 'Email':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800';
      case 'SMS':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800';
    }
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Playbooks & Modèles de Prospection</CardTitle>
              <p className="text-[11px] text-muted-foreground">Scripts réutilisables adaptés à tes cibles.</p>
            </div>
          </div>
        </div>

        {/* Custom Tab list switcher */}
        <div className="flex border-b border-border/50 mt-4 self-start gap-1 p-0.5 bg-muted/50 rounded-lg select-none">
          <button
            type="button"
            onClick={() => setActiveTab('cold')}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === 'cold'
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Premier contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === 'followup'
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Suivis & Relances
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === 'offers'
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Offres
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Playbook list under active tab */}
        <div className="space-y-3">
          {playbooks[activeTab]?.map((playbook) => (
            <div 
              key={playbook.id} 
              className="p-3.5 rounded-lg border border-border/60 hover:border-border transition-all bg-card/40 flex flex-col justify-between gap-3.5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{playbook.title}</span>
                  <span className={cn("text-[8px] font-bold tracking-wide uppercase border rounded px-1.5 py-0.5", getChannelBadge(playbook.channel))}>
                    {playbook.channel}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {playbook.description}
                </p>
              </div>

              {/* CTA button */}
              <div className="flex justify-end pt-1">
                <Button 
                  size="sm" 
                  onClick={() => handleUsePlaybook(playbook)}
                  className="h-7.5 px-3 bg-primary hover:bg-primary/95 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Send className="h-3 w-3 mr-1" />
                  <span>Utiliser pour un lead</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Customize Draft Dialog modal */}
      <Dialog open={selectedPlaybook !== null} onOpenChange={(open) => !open && setSelectedPlaybook(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Personnaliser le modèle</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sélectionne un prospect pour générer automatiquement les variables personnalisées.
            </DialogDescription>
          </DialogHeader>

          {selectedPlaybook && (
            <div className="space-y-4 my-2">
              {/* Select target lead */}
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choisir le prospect :</label>
                <Select value={targetLeadId} onValueChange={handleLeadChange}>
                  <SelectTrigger className="text-xs bg-card">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id} className="text-xs">
                        {l.businessName} ({l.contactName || 'Pas de contact'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject box for Emails */}
              {selectedPlaybook.channel === 'Email' && (
                <div className="grid gap-1">
                  <label htmlFor="email-subject-input" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Objet de l&apos;e-mail :</label>
                  <input
                    id="email-subject-input"
                    type="text"
                    value={customizedSubject}
                    onChange={(e) => setCustomizedSubject(e.target.value)}
                    placeholder="Saisir l'objet de l'e-mail..."
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              )}

              {/* Body text area */}
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contenu du message :</label>
                <Textarea 
                  value={customizedBody}
                  onChange={(e) => setCustomizedBody(e.target.value)}
                  rows={8}
                  className="text-xs bg-card resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border mt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedPlaybook(null)} className="text-xs">
              Annuler
            </Button>
            <Button 
              size="sm" 
              onClick={handleCopy}
              className={cn("text-xs font-semibold gap-1.5 transition-all duration-300", copied && "bg-emerald-600 hover:bg-emerald-600 text-white")}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copié dans le presse-papiers !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copier le message</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default IntelligencePlaybooksPanel;
