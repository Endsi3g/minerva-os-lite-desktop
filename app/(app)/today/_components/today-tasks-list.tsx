'use client';

import React from 'react';
import { TodayTaskItem } from './today-task-item';
import { Task } from '@/lib/mock-data';
import { ClipboardList } from 'lucide-react';

interface TodayTasksListProps {
  tasks: Task[];
}

export function TodayTasksList({ tasks }: TodayTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-border bg-card/30">
        <ClipboardList className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
        <h4 className="text-xs font-semibold text-foreground">Aucune tâche pour aujourd&apos;hui</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Ajoute des tâches transverses avec le bouton &quot;Nouvelle tâche&quot; ci-dessus.
        </p>
      </div>
    );
  }

  // Sort tasks: uncompleted first, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return 0;
  });

  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
      {sortedTasks.map((task) => (
        <TodayTaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
export default TodayTasksList;
