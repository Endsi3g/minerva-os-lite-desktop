'use client';

import React from 'react';
import { TodayTaskItem } from './today-task-item';
import { Task } from '@/lib/mock-data';
import { ClipboardList } from 'lucide-react';

interface TodayTasksListProps {
  tasks: Task[];
  onToggleTodoist?: (id: string) => void;
  onDeleteTodoist?: (id: string) => void;
}

export function TodayTasksList({ tasks, onToggleTodoist, onDeleteTodoist }: TodayTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-[#e5e5e0] bg-white/30">
        <ClipboardList className="h-6 w-6 text-[#7a7a76] mb-2 opacity-50" />
        <h4 className="text-xs font-semibold text-[#26251e]">Aucune tâche pour aujourd&apos;hui</h4>
        <p className="text-[10px] text-[#7a7a76] mt-0.5">
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
        <TodayTaskItem 
          key={task.id} 
          task={task} 
          onToggle={task.isTodoist ? onToggleTodoist : undefined}
          onDelete={task.isTodoist ? onDeleteTodoist : undefined}
        />
      ))}
    </div>
  );
}
export default TodayTasksList;
