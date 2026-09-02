'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Mic,
  MicOff,
  Loader2,
  Users,
  User,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { CloturerSubNav } from '@/app/(app)/_components/hub-nav/cloturer-sub-nav';

type FilterType = 'all' | 'today' | 'pending' | 'done';
type ViewType = 'list' | 'calendar';
type CategoryType = Task['category'] | 'All';
type TaskTab = 'mine' | 'team';

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

type Priority = NonNullable<Task['priority']>;
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};
const PRIORITY_DOT_COLORS: Record<Priority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

type Recurrence = NonNullable<Task['recurrence']>;
const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Ne se répète pas',
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
};

interface TeamMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name?: string | null; avatar_base64?: string | null } | null;
}

const MINERVA_AI_MEMBER: TeamMember = {
  id: 'minerva-ai',
  member_user_id: 'minerva-ai',
  email: 'ia@minerva.reach',
  profile: {
    full_name: 'Minerva Copilote IA',
  },
};

function MemberAvatar({ member, size = 'sm' }: { member: TeamMember; size?: 'sm' | 'md' }) {
  const isAi = member.id === 'minerva-ai' || member.member_user_id === 'minerva-ai' || member.profile?.full_name?.toLowerCase().includes('minerva');
  const sz = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-xs';
  if (isAi) {
    return (
      <div className={cn('rounded-full bg-[#059669]/15 border border-[#059669]/30 flex items-center justify-center text-[#059669] shrink-0', sz)}>
        <Bot className={size === 'sm' ? 'w-3 h-3 text-[#059669]' : 'w-4 h-4 text-[#059669]'} />
      </div>
    );
  }
  const name = member.profile?.full_name || member.email.split('@')[0];
  const avatar = member.profile?.avatar_base64;
  return (
    <div className={cn('rounded-full overflow-hidden bg-[#e5e5e2] flex items-center justify-center shrink-0 border border-[#e5e5e0]', sz)}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-[#807d72]">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onUpdate, teamMembers }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: { title?: string; dueDate?: string; dueTime?: string; category?: Task['category']; priority?: Task['priority']; recurrence?: Task['recurrence'] }) => void;
  teamMembers: TeamMember[];
}) {
  const handleMoveToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    onUpdate(task.id, { dueDate: tomorrow.toISOString().split('T')[0] });
  };

  const handleMakeUrgent = () => {
    onUpdate(task.id, { title: `🔥 [URGENT] ${task.title.replace('🔥 [URGENT] ', '')}` });
  };

  const assignedMember = task.assignedTo
    ? teamMembers.find(m => m.member_user_id === task.assignedTo || m.id === task.assignedTo)
    : null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-all group">
      <div className="flex items-start gap-3 min-w-0">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id)}
          className="mt-0.5 shrink-0"
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
          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate && (
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                <CalendarIcon className="w-2.5 h-2.5" />
                {task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ''}
              </span>
            )}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1" title={RECURRENCE_LABELS[task.recurrence]}>
                <Repeat className="w-2.5 h-2.5" />
              </span>
            )}
            {task.assignedToName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {task.assignedToName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.priority && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT_COLORS[task.priority])}
            title={`Priorité ${PRIORITY_LABELS[task.priority]}`}
          />
        )}
        {assignedMember && <MemberAvatar member={assignedMember} size="sm" />}
        {task.isTodoist && (
          <Badge variant="outline" className="text-[8px] bg-red-50 text-red-700 border-red-200 px-1.5 py-0.5 font-bold hidden sm:flex">
            Todoist
          </Badge>
        )}
        <Badge variant="outline" className={cn('text-[9px] font-semibold uppercase px-2 py-0.5 rounded border hidden sm:flex', CATEGORY_COLORS[task.category])}>
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
            {(['low', 'medium', 'high'] as Priority[]).map(p => (
              <DropdownMenuItem key={p} onClick={() => onUpdate(task.id, { priority: p })} className="text-xs gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT_COLORS[p])} />
                Priorité {PRIORITY_LABELS[p]}
              </DropdownMenuItem>
            ))}
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

// Grouped view by assignee for Team tab
function TeamTaskGroup({ member, tasks, onToggle, onDelete, onUpdate, teamMembers }: {
  member: TeamMember | null;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: { title?: string; dueDate?: string; dueTime?: string; category?: Task['category']; priority?: Task['priority']; recurrence?: Task['recurrence'] }) => void;
  teamMembers: TeamMember[];
}) {
  const [expanded, setExpanded] = useState(true);
  const name = member
    ? (member.profile?.full_name || member.email.split('@')[0])
    : 'Non assigné';
  const done = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 py-1"
      >
        {member ? <MemberAvatar member={member} size="md" /> : <User className="w-6 h-6 text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <span className="text-xs text-muted-foreground">({tasks.length} tâches, {done} complétées)</span>
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="space-y-2 pl-2 border-l-2 border-[#059669]/20 ml-3">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} teamMembers={teamMembers} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksRoot() {
  const { tasks, addTask, toggleTask, deleteTask, updateTask } = useReach();
  const { t } = useLanguage();

  const [taskTab, setTaskTab] = useState<TaskTab>('mine');
  const [view, setView] = useState<ViewType>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('All');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Team members for assignment
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Voice recognition
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  // Add task form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Task['category']>('General');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newRecurrence, setNewRecurrence] = useState<Recurrence>('none');
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDatePicker, setDueDatePicker] = useState<Date | undefined>(undefined);
  const [assignedMemberId, setAssignedMemberId] = useState<string>('none');
  const [assignMemberOpen, setAssignMemberOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch current user + team members
  useEffect(() => {
    const loadData = async () => {
      setLoadingMembers(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const res = await fetch(getApiUrl('/api/team/members'));
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members ?? []);
        }
      } catch { /* non-fatal */ }
      finally { setLoadingMembers(false); }
    };
    loadData();
  }, []);

  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La dictée vocale n'est pas supportée par votre navigateur.");
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsRecording(true);
      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (text?.trim()) {
          localStorage.setItem('minerva_pending_voice_query', text);
          setIsRecording(false);
          setIsProcessingVoice(false);
          toast.success("Redirection vers l'Assistant IA...");
          window.location.href = '/assistant';
        }
      };
      rec.onerror = (e: any) => {
        setIsRecording(false);
        if (e.error === 'not-allowed') toast.error("Accès au microphone refusé.");
        else toast.error(`Erreur de dictée: ${e.error}`);
      };
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const myTasks = useMemo(() => tasks.filter(t =>
    !t.assignedTo || t.assignedTo === currentUserId
  ), [tasks, currentUserId]);

  const teamTasks = useMemo(() => tasks.filter(t =>
    t.assignedTo && t.assignedTo !== currentUserId
  ), [tasks, currentUserId]);

  const activeTasks = taskTab === 'mine' ? myTasks : teamTasks;

  const filteredTasks = useMemo(() => {
    let result = [...activeTasks];

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
  }, [activeTasks, filter, categoryFilter, view, selectedDate, today]);

  // All assignable members: Minerva AI + human team members
  const allAssignableMembers = useMemo(() => [MINERVA_AI_MEMBER, ...teamMembers], [teamMembers]);

  // For team tab: group tasks by assignee
  const teamTasksByMember = useMemo(() => {
    if (taskTab !== 'team') return [];
    const groups: Record<string, Task[]> = {};
    for (const task of filteredTasks) {
      const key = task.assignedTo ?? 'unassigned';
      (groups[key] ||= []).push(task);
    }
    return Object.entries(groups).map(([key, tasks]) => ({
      memberId: key,
      member: key === 'unassigned' ? null : (allAssignableMembers.find(m => m.member_user_id === key || m.id === key) ?? null),
      tasks,
    }));
  }, [taskTab, filteredTasks, allAssignableMembers]);

  // Days that have tasks (for calendar indicators)
  const taskDays = useMemo(() => {
    const days = new Set<string>();
    activeTasks.forEach(t => { if (t.dueDate) days.add(t.dueDate); });
    return days;
  }, [activeTasks]);

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    let assignedTo: string | undefined;
    let assignedToName: string | undefined;

    if (assignedMemberId && assignedMemberId !== 'none') {
      const m = allAssignableMembers.find(m => m.id === assignedMemberId);
      if (m) {
        assignedTo = m.member_user_id ?? m.id;
        assignedToName = m.profile?.full_name || m.email.split('@')[0];
      }
    }

    addTask(title, newCategory, newDueDate || undefined, undefined, assignedTo, assignedToName, newDueTime || undefined, newPriority, newRecurrence);
    setNewTitle('');
    setNewCategory('General');
    setNewDueDate('');
    setNewDueTime('');
    setNewPriority('medium');
    setNewRecurrence('none');
    setDueDatePicker(undefined);
    setAssignedMemberId('none');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTask();
  };

  const pendingCount = myTasks.filter(t => !t.completed).length;
  const doneCount = myTasks.filter(t => t.completed).length;
  const teamPendingCount = teamTasks.filter(t => !t.completed).length;
  const teamDoneCount = teamTasks.filter(t => t.completed).length;

  const selectedMember = assignedMemberId !== 'none'
    ? allAssignableMembers.find(m => m.id === assignedMemberId)
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8]">
      <CloturerSubNav />
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#e5e5e0] pb-5">
            <div>
              <h1 className="text-2xl font-heading font-sans font-black tracking-tight text-[#14171A]">
                {t('tasks.title') || 'Gestion des Tâches & Actions'}
              </h1>
              <p className="text-xs text-[#4B5158] mt-1 font-medium">
                {t('tasks.subtitle') || 'Suivez et assignez vos tâches de prospection, rappels et closings.'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e0] rounded-xl p-1 shadow-2xs">
              <button
                onClick={() => setView('list')}
                className={cn('h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5', view === 'list' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#7a7a76] hover:text-[#26251e]')}
              >
                <List className="h-3.5 w-3.5" />
                <span>{t('tasks.view_list') || 'Liste'}</span>
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn('h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5', view === 'calendar' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#7a7a76] hover:text-[#26251e]')}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{t('tasks.view_calendar') || 'Calendrier'}</span>
              </button>
            </div>
          </div>

        {/* Tabs: Mine / Team */}
        <div className="flex items-center gap-0 bg-muted/40 rounded-xl p-1">
          <button
            onClick={() => setTaskTab('mine')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              taskTab === 'mine' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="h-3.5 w-3.5" />
            Mes tâches
            <span className={cn(
              'ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              taskTab === 'mine' ? 'bg-[#059669] text-white' : 'bg-muted text-muted-foreground'
            )}>
              {myTasks.filter(t => !t.completed).length}
            </span>
          </button>
          <button
            onClick={() => setTaskTab('team')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              taskTab === 'team' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Équipe
            {teamTasks.filter(t => !t.completed).length > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                taskTab === 'team' ? 'bg-[#059669] text-white' : 'bg-muted text-muted-foreground'
              )}>
                {teamTasks.filter(t => !t.completed).length}
              </span>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {(taskTab === 'mine' ? [
            { label: 'Total', value: myTasks.length, accent: false },
            { label: t('tasks.filter_pending'), value: pendingCount, accent: true },
            { label: t('tasks.filter_done'), value: doneCount, accent: false },
          ] : [
            { label: 'Total équipe', value: teamTasks.length, accent: false },
            { label: 'En cours', value: teamPendingCount, accent: true },
            { label: 'Complétées', value: teamDoneCount, accent: false },
          ]).map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3 text-center">
              <div className={cn('text-2xl font-bold', s.accent ? 'text-[#059669]' : 'text-foreground')}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add task form */}
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/40">
          {/* Title + mic row */}
          <div className="relative flex items-center">
            <Input
              placeholder={t('tasks.new_task_placeholder')}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm pr-9 flex-1"
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessingVoice}
              className={cn(
                "absolute right-2 p-1.5 rounded-full transition-all duration-300",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Dicter une tâche avec l'IA"
            >
              {isProcessingVoice ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Category + date + assign + submit row */}
          <div className="flex flex-wrap gap-2">
            <Select value={newCategory} onValueChange={v => setNewCategory(v as Task['category'])}>
              <SelectTrigger className="h-8 w-28 text-xs shrink-0">
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
                <Button variant="outline" className="h-8 text-xs gap-1.5 w-28 justify-start shrink-0">
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

            {newDueDate && (
              <div className="relative h-8 w-24 shrink-0">
                <Clock className="absolute left-2 top-2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <input
                  type="time"
                  value={newDueTime}
                  onChange={e => setNewDueTime(e.target.value)}
                  className="h-8 w-full pl-6 pr-1 text-xs rounded-md border border-input bg-transparent outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            <Select value={newPriority} onValueChange={v => setNewPriority(v as Priority)}>
              <SelectTrigger className="h-8 w-28 text-xs shrink-0">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT_COLORS[newPriority])} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['low', 'medium', 'high'] as Priority[]).map(p => (
                  <SelectItem key={p} value={p} className="text-xs">
                    <span className={cn('h-1.5 w-1.5 rounded-full inline-block mr-1', PRIORITY_DOT_COLORS[p])} />
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newRecurrence} onValueChange={v => setNewRecurrence(v as Recurrence)}>
              <SelectTrigger className="h-8 w-32 text-xs shrink-0">
                <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => (
                  <SelectItem key={r} value={r} className="text-xs">{RECURRENCE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assign member */}
            <Popover open={assignMemberOpen} onOpenChange={setAssignMemberOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 text-xs gap-1.5 min-w-[90px] justify-start shrink-0">
                  {selectedMember ? (
                    <>
                      <MemberAvatar member={selectedMember} size="sm" />
                      <span className="truncate max-w-[90px]">
                        {selectedMember.profile?.full_name || selectedMember.email.split('@')[0]}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3" />
                      Assigner
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1.5" align="start">
                <div className="space-y-0.5">
                  <button
                    onClick={() => { setAssignedMemberId('none'); setAssignMemberOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                      assignedMemberId === 'none' ? 'bg-[#059669]/8 text-[#059669]' : 'hover:bg-muted'
                    )}
                  >
                    <User className="h-3.5 w-3.5" />
                    Moi-même
                  </button>
                  {allAssignableMembers.map(m => {
                    const name = m.profile?.full_name || m.email.split('@')[0];
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setAssignedMemberId(m.id); setAssignMemberOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                          assignedMemberId === m.id ? 'bg-[#059669]/8 text-[#059669]' : 'hover:bg-muted'
                        )}
                      >
                        <MemberAvatar member={m} size="sm" />
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              onClick={handleAddTask}
              disabled={!newTitle.trim()}
              className="h-8 bg-[#059669] hover:bg-[#047857] text-white gap-1.5 text-xs ml-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('tasks.add')}
            </Button>
          </div>
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
                modifiersClassNames={{ hasTask: 'bg-[#059669]/10 font-bold text-[#059669] rounded-md' }}
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
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} teamMembers={teamMembers} />
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
                      ? 'bg-[#059669] text-white hover:bg-[#047857]'
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
              {filteredTasks.length === 0 && teamTasksByMember.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>
                  <Button
                    size="sm"
                    onClick={() => document.querySelector<HTMLInputElement>('input[placeholder]')?.focus()}
                    className="bg-[#059669] hover:bg-[#047857] text-white text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('tasks.add')}
                  </Button>
                </div>
              ) : taskTab === 'team' ? (
                // Team view — grouped by member
                <div className="space-y-5">
                  {teamTasksByMember.map(group => (
                    <TeamTaskGroup
                      key={group.memberId}
                      member={group.member}
                      tasks={group.tasks}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      teamMembers={teamMembers}
                    />
                  ))}
                  {teamTasksByMember.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <Users className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Aucune tâche d&apos;équipe assignée</p>
                      <p className="text-xs text-muted-foreground/60">Créez une tâche et assignez-la à un membre ci-dessus</p>
                    </div>
                  )}
                </div>
              ) : (
                // My tasks flat list
                filteredTasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} teamMembers={teamMembers} />
                ))
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
