'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Mail, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/lib/api-helper';
import { useLanguage } from '@/lib/language-context';

type Role = 'admin' | 'editor' | 'viewer';

interface InviteStatus {
  email: string;
  status: 'idle' | 'sending' | 'success' | 'error';
  message?: string;
  invite_link?: string;
  email_sent?: boolean;
}

export default function InvitePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [rawEmails, setRawEmails] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInviteBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawEmails.trim()) return;

    // Split emails by comma or whitespace/new lines and filter empty/invalid ones
    const emailList = rawEmails
      .split(/[\s,\n]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => {
        // Basic email validation regex
        return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      });

    if (emailList.length === 0) {
      setInviteStatuses([
        { email: 'No valid emails found', status: 'error', message: 'Veuillez saisir des adresses email valides.' }
      ]);
      return;
    }

    // Initialize statuses
    const initialStatuses = emailList.map(email => ({
      email,
      status: 'idle' as const
    }));
    setInviteStatuses(initialStatuses);
    setIsProcessing(true);

    // Process invitations sequentially or in parallel
    for (let i = 0; i < initialStatuses.length; i++) {
      const current = initialStatuses[i];
      
      // Update state to sending
      setInviteStatuses(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'sending' } : item
      ));

      try {
        const res = await fetch(getApiUrl('/api/team/invite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: current.email,
            role: role
          }),
        });

        const data = await res.json();
        
        if (res.ok) {
          setInviteStatuses(prev => prev.map((item, idx) =>
            idx === i ? {
              ...item,
              status: 'success',
              invite_link: data.invite_link,
              email_sent: data.email_sent,
            } : item
          ));
        } else {
          setInviteStatuses(prev => prev.map((item, idx) => 
            idx === i ? { ...item, status: 'error', message: data.error || 'Erreur lors de l\'invitation' } : item
          ));
        }
      } catch (err) {
        console.error('Error inviting email:', current.email, err);
        setInviteStatuses(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', message: 'Erreur réseau ou serveur' } : item
        ));
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#fafaf8] overflow-y-auto px-6 py-8 md:px-12 md:py-10 text-left">
      {/* Header and Back navigation */}
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/team"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#555552] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-semibold text-[#7a7a76]">Retour aux membres</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#26251e] tracking-tight flex items-center gap-3 font-sans">
            <UserPlus className="w-6 h-6 text-[#10b981]" />
            <span>Inviter des collaborateurs</span>
          </h1>
          <p className="text-xs text-[#7a7a76]">
            Ajoutez de nouveaux membres à votre espace de travail en spécifiant leurs adresses e-mail.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pt-4">
          {/* Main Input Form */}
          <div className="lg:col-span-3 bg-white border border-[#e5e5e0] rounded-xl p-5 md:p-6 space-y-6 shadow-xs">
            <form onSubmit={handleInviteBulk} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block">
                  Adresses e-mail des collaborateurs
                </label>
                <textarea
                  required
                  rows={5}
                  value={rawEmails}
                  onChange={(e) => setRawEmails(e.target.value)}
                  placeholder="exemple1@domaine.com, exemple2@domaine.com"
                  disabled={isProcessing}
                  className="w-full text-xs p-3 bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#10b981] placeholder-[#7a7a76]/60 font-sans"
                />
                <p className="text-[10px] text-[#7a7a76] leading-normal">
                  Séparez les adresses e-mail par des virgules, des espaces ou des sauts de ligne.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block">
                  Rôle attribué à ces membres
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['viewer', 'editor', 'admin'] as const).map(roleOption => (
                    <button
                      key={roleOption}
                      type="button"
                      onClick={() => setRole(roleOption)}
                      disabled={isProcessing}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all capitalize ${
                        role === roleOption
                          ? 'bg-[#26251e] border-[#26251e] text-white shadow-sm'
                          : 'bg-white border-[#e5e5e0] text-[#555552] hover:bg-[#fafaf8]'
                      }`}
                    >
                      {roleOption === 'viewer' ? 'Lecteur' : roleOption === 'editor' ? 'Éditeur' : 'Administrateur'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#7a7a76] leading-normal pt-1">
                  {role === 'viewer' && 'Lecteur : Peut voir les prospects et les rapports, mais ne peut pas faire de modifications.'}
                  {role === 'editor' && 'Éditeur : Peut modifier les prospects, générer des e-mails, et ajouter de nouvelles notes.'}
                  {role === 'admin' && 'Administrateur : Possède tous les droits, y compris la modification des intégrations et l\'invitation de membres.'}
                </p>
              </div>

              <div className="pt-2 border-t border-[#e5e5e0]/60 flex items-center justify-between">
                <Link href="/team">
                  <Button variant="ghost" type="button" className="text-[#555552] text-xs h-9">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isProcessing || !rawEmails.trim()}
                  className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs h-9 px-4 flex items-center gap-2 rounded-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Envoyer les invitations</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Real-time Status Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e5e5e0] pb-2">
                Statut des envois
              </h3>
              
              {inviteStatuses.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7a7a76] space-y-2">
                  <UserPlus className="w-8 h-8 text-[#e5e5e0] mx-auto" />
                  <p>Aucune invitation envoyée pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {inviteStatuses.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-xs border-b border-[#fafaf8] pb-2 last:border-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#26251e] truncate">{item.email}</p>
                        {item.message && (
                          <p className="text-[10px] text-red-600 font-medium leading-tight mt-0.5">{item.message}</p>
                        )}
                      </div>
                      
                      <div className="shrink-0">
                        {item.status === 'idle' && (
                          <span className="text-[10px] text-[#7a7a76] font-semibold bg-neutral-100 px-2 py-0.5 rounded-md">En attente</span>
                        )}
                        {item.status === 'sending' && (
                          <span className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Envoi
                          </span>
                        )}
                        {item.status === 'success' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              {item.email_sent === false ? 'Créé — lien manuel' : 'Invité'}
                            </span>
                            {item.email_sent === false && item.invite_link && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(item.invite_link!); }}
                                className="text-[9px] text-[#059669] hover:underline font-medium"
                                title="Aucun fournisseur email configuré — copiez ce lien et envoyez-le manuellement"
                              >
                                📋 Copier le lien d&apos;invitation
                              </button>
                            )}
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span className="text-[10px] text-red-700 font-semibold bg-red-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <X className="w-3 h-3" />
                            Échoué
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex gap-3 text-left">
              <AlertCircle className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#166534]">Comment ça marche ?</h4>
                <p className="text-[10px] text-[#166534] leading-normal">
                  Chaque collaborateur recevra un e-mail d'invitation avec un lien sécurisé unique pour configurer son compte et rejoindre votre espace de travail.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
