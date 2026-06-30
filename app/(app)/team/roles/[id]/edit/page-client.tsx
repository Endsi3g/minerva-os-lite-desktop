'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api-helper';
import { RoleCreateForm } from '@/app/(app)/settings/roles/new/role-create-form';
import { type PermissionModule } from '@/lib/permissions';
import { Loader2 } from 'lucide-react';

interface CustomRole {
  id: string;
  name: string;
  color: string;
  permissions: PermissionModule[];
}

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/team/roles'))
      .then(r => r.json())
      .then(data => {
        const found = (data.roles || []).find((r: CustomRole) => r.id === id);
        if (found) setRole(found); else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-[#059669]" />
      </div>
    );
  }

  if (notFound || !role) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[#7a7a76]">Rôle introuvable.</p>
      </div>
    );
  }

  return (
    <RoleCreateForm
      roleId={role.id}
      initialName={role.name}
      initialColor={role.color}
      initialPermissions={role.permissions}
      redirectTo="/team?tab=roles"
    />
  );
}
