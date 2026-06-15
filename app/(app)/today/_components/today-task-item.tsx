'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { Task } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

interface TodayTaskItemProps {
  task: Task;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TodayTaskItem({ task, onToggle, onDelete }: TodayTaskItemProps) {
  const { toggleTask, deleteTask, addTask } = useReach();

  const getCategoryColor = (cat: Task['category']) => {
    switch (cat) {
      case 'Follow-up':
        return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
      case 'Preparation':
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
      case 'Meeting':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
    }
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle(task.id);
    } else {
      toggleTask(task.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    } else {
      deleteTask(task.id);
    }
  };

  const handleMoveToTomorrow = () => {
    handleDelete();
  };

  const handleMakeUrgent = () => {
    handleDelete();
    addTask(`🔥 [URGENT] ${task.title.replace('🔥 [URGENT] ', '')}`, task.category);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-all group">
      <div className="flex items-start gap-3 min-w-0">
        <Checkbox 
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={handleToggle}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-0.5 min-w-0 text-left">
          <label 
            htmlFor={`task-${task.id}`}
            className={cn(
              "text-xs font-semibold cursor-pointer leading-tight select-none",
              task.completed ? "line-through text-muted-foreground font-normal" : "text-foreground font-medium"
            )}
          >
            {task.title}
          </label>
          
          {task.description && (
            <span className="text-[10px] text-muted-foreground leading-normal line-clamp-2 text-left">
              {task.description}
            </span>
          )}

          {task.dueDate && (
            <span className="text-[9px] text-amber-600 font-bold flex items-center gap-1 mt-0.5 text-left">
              <Calendar className="w-2.5 h-2.5" />
              Échéance : {task.dueDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.isTodoist && (
          <Badge 
            variant="outline" 
            className="text-[8px] bg-red-50 text-red-700 border-red-200 px-1.5 py-0.5 rounded font-bold"
          >
            Todoist
          </Badge>
        )}

        <Badge 
          variant="outline" 
          className={cn("text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded", getCategoryColor(task.category))}
        >
          {task.category === 'Follow-up' ? 'Relance' : task.category === 'Preparation' ? 'Prép.' : task.category === 'Meeting' ? 'RDV' : 'Général'}
        </Badge>
 
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={handleMoveToTomorrow} className="text-xs gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Reporter à demain</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMakeUrgent} className="text-xs gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span>Marquer urgent</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-xs gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Supprimer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
export default TodayTaskItem;
