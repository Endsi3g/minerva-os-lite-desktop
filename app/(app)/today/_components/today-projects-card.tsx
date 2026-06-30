'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, ArrowRight, Plus } from 'lucide-react';
import { useReach } from '@/lib/reach-context';

export function TodayProjectsCard() {
  const { projects } = useReach();

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 text-violet-600">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Projets en cours</CardTitle>
            <CardDescription className="text-xs">
              {projects.length > 0
                ? `${projects.length} projet${projects.length > 1 ? 's' : ''} actif${projects.length > 1 ? 's' : ''}`
                : 'Aucun projet pour cet espace de travail'}
            </CardDescription>
          </div>
        </div>
        {projects.length > 0 && (
          <span className="text-[10px] font-bold text-[#7a7a76] bg-[#f4f4f3] border border-[#e5e5e0] px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-xs text-[#7a7a76]">Créez votre premier projet depuis la barre latérale.</p>
          </div>
        ) : (
          <>
            {projects.slice(0, 5).map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[#e5e5e0] bg-white/60 hover:bg-[#f4f4f3]/60 transition-colors group"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold text-[#26251e] truncate">{project.name}</span>
                  {project.description && (
                    <span className="text-[10px] text-[#7a7a76] truncate">{project.description}</span>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#7a7a76] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
            {projects.length > 5 && (
              <p className="text-[10px] text-[#7a7a76] text-center pt-1">
                +{projects.length - 5} autre{projects.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayProjectsCard;
