'use client';
// Page de création de rôle dédiée (Team) — formulaire nom + couleur + permissions
import { RoleCreateForm } from '../../../settings/roles/new/role-create-form';

export default function TeamNewRolePage() {
  return <RoleCreateForm redirectTo="/team?tab=roles" />;
}
