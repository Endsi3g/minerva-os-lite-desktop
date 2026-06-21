'use client';

import React, { useState, useMemo } from 'react';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Task } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  ClipboardList,
  List,
  CalendarDays,
  Plus,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Trash2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';

type FilterType = 'all' | 'today' | 'pending' | 'done';
type ViewType = 'list' | 'calendar';
type CategoryType = Task['category'] | 'All';

const CATEGORY_COLORS: Record<Task['category'], string> = {
  'Follow-up': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  'Preparation': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  'Meeting': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  'General': 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
};

const CATEGORY_LABELS: Record<Task['category'], string> = {
  'Follow-up': 'Relance',
  'Preparation': 'Prép.',
  'Meeting': 'RDV',
  'General': 'Général',
};

function TaskItem({ task, onToggle, onDelete, onUpdate }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: { title?: string; dueDate?: string; category?: Task['category'] }) => void;
}) {
  const handleMoveToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    onUpdate(task.id, { dueDate: tomorrow.toISOString().split('T')[0] });
  };

  const handleMakeUrgent = () => {
    onUpdate(task.id, { title: `🔥 [URGENT] ${task.title.replace('🔥 [URGENT] ', '')}` });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-all group">
      <div className="flex items-start gap-3 min-w-0">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id)}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              'text-sm font-medium cursor-pointer leading-tight select-none',
              task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            )}
          >
            {task.title}
          </label>
          {task.dueDate && (
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
              <CalendarIcon className="w-2.5 h-2.5" />
              {task.dueDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.isTodoist && (
          <Badge variant="outline" className="text-[8px] bg-red-50 text-red-700 border-red-200 px-1.5 py-0.5 font-bold">
            Todoist
          </Badge>
        )}
        <Badge variant="outline" className={cn('text-[9px] font-semibold uppercase px-2 py-0.5 rounded border', CATEGORY_COLORS[task.category])}>
          {CATEGORY_LABELS[task.category]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleMoveToTomorrow} className="text-xs gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Reporter à demain
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMakeUrgent} className="text-xs gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Marquer urgent
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-xs gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function TasksRoot() {
  const { tasks, addTask, toggleTask, deleteTask, updateTask } = useReach();
  const { t } = useLanguage();

  const [view, setView] = useState<ViewType>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('All');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Add task form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Task['category']>('General');
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDatePicker, setDueDatePicker] = useState<Date | undefined>(undefined);

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (view === 'calendar' && selectedDate) {
      const sel = selectedDate.toISOString().split('T')[0];
      result = result.filter(t => t.dueDate === sel);
    } else {
      if (filter === 'today') result = result.filter(t => t.dueDate === today);
      else if (filter === 'pending') result = result.filter(t => !t.completed);
      else if (filter === 'done') result = result.filter(t => t.completed);
    }

    if (categoryFilter !== 'All') {
      result = result.filter(t => t.category === categoryFilter);
    }

    return result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
    });
  }, [tasks, filter, categoryFilter, view, selectedDate, today]);

  // Days that have tasks (for calendar indicators)
  const taskDays = useMemo(() => {
    const days = new Set<string>();
    tasks.forEach(t => { if (t.dueDate) days.add(t.dueDate); });
    return days;
  }, [tasks]);

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    addTask(title, newCategory, newDueDate || undefined);
    setNewTitle('');
    setNewCategory('General');
    setNewDueDate('');
    setDueDatePicker(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTask();
  };

  const pendingCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.filter(t => t.completed).length;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#f54e00]/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-[#f54e00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('tasks.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('tasks.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('list')}
              className={cn('h-7 px-2 gap-1.5 text-xs', view === 'list' && 'bg-background shadow-sm text-foreground')}
            >
              <List className="h-3.5 w-3.5" />
              {t('tasks.view_list')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('calendar')}
              className={cn('h-7 px-2 gap-1.5 text-xs', view === 'calendar' && 'bg-background shadow-sm text-foreground')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t('tasks.view_calendar')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: tasks.length },
            { label: t('tasks.filter_pending'), value: pendingCount, accent: true },
            { label: t('tasks.filter_done'), value: doneCount },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3 text-center">
              <div className={cn('text-2xl font-bold', s.accent ? 'text-[#f54e00]' : 'text-foreground')}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add task form */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border border-border bg-card/40">
          <Input
            placeholder={t('tasks.new_task_placeholder')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm flex-1"
          />
          <Select value={newCategory} onValueChange={v => setNewCategory(v as Task['category'])}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['General', 'Follow-up', 'Preparation', 'Meeting'] as Task['category'][]).map(c => (
                <SelectItem key={c} value={c} className="text-xs">{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 text-xs gap-1.5 w-28 justify-start">
                <CalendarIcon className="h-3 w-3" />
                {newDueDate || t('tasks.due_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDatePicker}
                onSelect={d => {
                  setDueDatePicker(d);
                  setNewDueDate(d ? d.toISOString().split('T')[0] : '');
                  setDueDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            onClick={handleAddTask}
            disabled={!newTitle.trim()}
            className="h-8 bg-[#f54e00] hover:bg-[#d94400] text-white gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('tasks.add')}
          </Button>
        </div>

        {/* Calendar view */}
        {view === 'calendar' && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasTask: (d) => taskDays.has(d.toISOString().split('T')[0]) }}
                modifiersClassNames={{ hasTask: 'bg-[#f54e00]/10 font-bold text-[#f54e00] rounded-md' }}
                className="rounded-xl border border-border bg-card p-3"
              />
            </div>
            <div className="flex-1 space-y-2">
              {selectedDate && (
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {format(selectedDate, 'EEEE d MMMM yyyy')}
                </p>
              )}
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Aucune tâche ce jour.</p>
              ) : (
                filteredTasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                ))
              )}
            </div>
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'today', 'pending', 'done'] as FilterType[]).map(f => (
                <Button
                  key={f}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'h-7 px-3 text-xs rounded-full',
                    filter === f
                      ? 'bg-[#f54e00] text-white hover:bg-[#d94400]'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t(`tasks.filter_${f}` as `tasks.filter_${typeof f}`)}
                </Button>
              ))}
              <div className="ml-auto">
                <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as CategoryType)}>
                  <SelectTrigger className="h-7 text-xs w-32 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">Toutes catégories</SelectItem>
                    {(['Follow-up', 'Preparation', 'Meeting', 'General'] as Task['category'][]).map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task list */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>
                  <Button
                    size="sm"
                    onClick={() => document.querySelector<HTMLInputElement>('input[placeholder]')?.focus()}
                    className="bg-[#f54e00] hover:bg-[#d94400] text-white text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('tasks.add')}
                  </Button>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
