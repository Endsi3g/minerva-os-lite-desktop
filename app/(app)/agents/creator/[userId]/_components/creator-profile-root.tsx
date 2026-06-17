'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MinervaIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { getAgents } from '@/lib/onboarding-store';
import { ArrowLeft, User } from 'lucide-react';

interface CreatorData {
  fullName: string;
  company: string;
  bio: string;
  avatarBase64?: string;
  userRole?: string;
}

export function CreatorProfileRoot({ userId }: { userId: string }) {
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [userAgents, setUserAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check if viewing own profile
        if (user?.id === userId) setIsSelf(true);

        const { data } = await supabase
          .from('settings')
          .select('full_name, company_name, bio, avatar_base64, user_role')
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          setCreator({
            fullName: data.full_name || 'Utilisateur',
            company: data.company_name || '',
            bio: data.bio || '',
            avatarBase64: data.avatar_base64,
            userRole: data.user_role,
          });
        }

        // Get agents created by this user from local store (for own profile)
        if (user?.id === userId) {
          const agents = getAgents().map(a => ({
            id: a.id,
            name: a.name,
            description: a.description || '',
          }));
          setUserAgents(agents);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [userId]);

  if (!creator) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto p-6 space-y-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>

        {/* Profile header */}
        <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 flex items-start gap-5">
          {creator.avatarBase64 ? (
            <img
              src={creator.avatarBase64}
              alt={creator.fullName}
              className="w-16 h-16 rounded-full object-cover border border-[#e5e5e0] shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] text-xl font-bold shrink-0">
              {creator.fullName.substring(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#26251e]">{creator.fullName}</h1>
            {creator.userRole && (
              <p className="text-xs text-[#059669] font-semibold">{creator.userRole}</p>
            )}
            {creator.company && (
              <p className="text-xs text-[#7a7a76]">{creator.company}</p>
            )}
            {creator.bio && (
              <p className="text-sm text-[#555552] mt-3 leading-relaxed">{creator.bio}</p>
            )}
          </div>
        </div>

        {/* Agents created */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Agents créés {userAgents.length > 0 && `(${userAgents.length})`}
          </h2>
          {userAgents.length === 0 ? (
            <p className="text-xs text-[#7a7a76]">Aucun agent personnalisé publié.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userAgents.map(agent => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="p-4 border border-[#e5e5e0] hover:border-[#7a7a76] bg-white rounded-xl flex flex-col gap-2 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0">
                    <MinervaIcon size={16} />
                  </div>
                  <p className="text-xs font-semibold text-[#26251e] truncate">{agent.name}</p>
                  <p className="text-[11px] text-[#7a7a76] line-clamp-2">{agent.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {isSelf && (
          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs h-8">
              Modifier mon profil
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default CreatorProfileRoot;
