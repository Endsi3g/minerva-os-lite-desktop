'use client';
// Page de création de rôle dédiée (Settings) — formulaire nom + couleur + permissions
import { RoleCreateForm } from './role-create-form';

export default function SettingsNewRolePage() {
  return <RoleCreateForm redirectTo="/settings?section=roles" />;
}
