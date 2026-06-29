'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';

interface Permission {
  label: string;
  description: string;
  member: boolean | 'partial';
  editor: boolean | 'partial';
  admin: boolean;
}

interface PermissionGroup {
  title: string;
  permissions: Permission[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Espace de travail',
    permissions: [
      {
        label: 'Gérer les paramètres',
        description: 'Accéder et modifier les paramètres de l\'espace de travail',
        member: false,
        editor: false,
        admin: true,
      },
    ],
  },
  {
    title: 'Agents',
    permissions: [
      {
        label: 'Créer des agents',
        description: 'Créer de nouveaux agents',
        member: true,
        editor: true,
        admin: true,
      },
      {
        label: 'Partager avec n\'importe quel groupe',
        description: 'Partager des agents avec des groupes dont vous n\'êtes pas membre',
        member: false,
        editor: false,
        admin: true,
      },
      {
        label: 'Partager avec votre espace de travail',
        description: 'Partager des agents avec l\'ensemble de l\'espace de travail',
        member: true,
        editor: true,
        admin: true,
      },
    ],
  },
  {
    title: 'Leads & Projets',
    permissions: [
      {
        label: 'Partager des projets',
        description: 'Partager des projets avec des utilisateurs et groupes individuels',
        member: true,
        editor: true,
        admin: true,
      },
      {
        label: 'Assigner des leads',
        description: 'Assigner des leads à d\'autres membres de l\'équipe',
        member: false,
        editor: true,
        admin: true,
      },
      {
        label: 'Supprimer des leads',
        description: 'Supprimer définitivement des leads du CRM',
        member: false,
        editor: false,
        admin: true,
      },
    ],
  },
  {
    title: 'Intégrations',
    permissions: [
      {
        label: 'Gérer les intégrations',
        description: 'Configurer et supprimer les intégrations de l\'espace de travail',
        member: false,
        editor: false,
        admin: true,
      },
      {
        label: 'Utiliser les intégrations',
        description: 'Utiliser les intégrations configurées dans le chat et les agents',
        member: true,
        editor: true,
        admin: true,
      },
    ],
  },
];

function PermissionCell({ value }: { value: boolean | 'partial' }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
          <Check className="w-3 h-3 text-primary" />
        </div>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <span className="text-[10px] text-muted-foreground font-medium">Non autorisé</span>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="text-[10px] text-muted-foreground font-medium">Partiel</span>
    </div>
  );
}

export function SettingsRolesSection() {
  return (
    <SettingsSectionWrapper
      title="Rôles"
      description="Configurez les autorisations spécifiques pour chaque rôle."
      isSaving={false}
    >
      <div className="flex justify-end mb-3">
        <Link
          href="/settings/roles/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#26251e] text-white text-xs font-bold hover:bg-[#3d3c35] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Créer un rôle
        </Link>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_100px_100px] border-b border-border bg-muted/40">
          <div className="px-4 py-3" />
          {['Membre', 'Éditeur', 'Admin'].map((role) => (
            <div key={role} className="px-2 py-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{role}</span>
            </div>
          ))}
        </div>

        {/* Permission groups */}
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.title}</span>
            </div>
            {group.permissions.map((perm, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground">{perm.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{perm.description}</p>
                </div>
                <div className="py-3"><PermissionCell value={perm.member} /></div>
                <div className="py-3"><PermissionCell value={perm.editor} /></div>
                <div className="py-3"><PermissionCell value={perm.admin} /></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SettingsSectionWrapper>
  );
}
