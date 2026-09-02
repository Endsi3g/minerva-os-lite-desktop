'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TodayTasksList } from './today-tasks-list';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { ListTodo, Loader2 } from 'lucide-react';
import { Task } from '@/lib/mock-data';

export function TodayTasksCard() {
  const { tasks, user } = useReach();
  const { t } = useLanguage();
  
  // Todoist states
  const [todoistToken, setTodoistToken] = useState('');
  const [todoistProjectId, setTodoistProjectId] = useState('');
  const [todoistTasks, setTodoistTasks] = useState<Task[]>([]);
  const [loadingTodoist, setLoadingTodoist] = useState(false);

  // Trigger HTML5 Notification for tasks due today
  const checkDeadlinesAndNotify = (taskList: Task[]) => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];
    const notified = JSON.parse(localStorage.getItem('minerva_notified_todoist_tasks') || '{}');

    taskList.forEach(task => {
      // If task is due today or in the past (overdue), notify once
      if (task.dueDate && task.dueDate <= todayStr && !task.completed) {
        const rawId = task.rawTodoistId || task.id;
        if (!notified[rawId]) {
          const triggerAlert = () => {
            new Notification(`Échéance de tâche Todoist`, {
              body: `La tâche "${task.title}" doit être complétée aujourd'hui !`,
            });
            notified[rawId] = true;
            localStorage.setItem('minerva_notified_todoist_tasks', JSON.stringify(notified));
          };

          if (Notification.permission === 'granted') {
            triggerAlert();
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                triggerAlert();
              }
            });
          }
        }
      }
    });
  };

  // Load Todoist settings and fetch tasks — mount only, user from ReachContext
  useEffect(() => {
    if (!user) return;
    const fetchTodoistTasks = async () => {
      try {
        const electronObj = typeof window !== 'undefined' && (window as any).electron;
        if (!electronObj) return;

        const dbSettings = await electronObj.dbGet(
          "SELECT todoist_token, todoist_project_id FROM settings WHERE user_id = ? LIMIT 1",
          [user.id]
        );
        if (!dbSettings?.todoist_token) return;

        setTodoistToken(dbSettings.todoist_token);
        setTodoistProjectId(dbSettings.todoist_project_id || '');
        setLoadingTodoist(true);

        const url = dbSettings.todoist_project_id
          ? `https://api.todoist.com/rest/v2/tasks?project_id=${dbSettings.todoist_project_id}`
          : 'https://api.todoist.com/rest/v2/tasks';

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${dbSettings.todoist_token}` } });
        if (res.ok) {
          const data = await res.json();
          const mapped: Task[] = data.map((item: any) => ({
            id: `todoist-${item.id}`,
            title: item.content,
            completed: false,
            category: 'General',
            dueDate: item.due ? item.due.date : '',
            description: item.description || '',
            isTodoist: true,
            rawTodoistId: item.id
          }));
          setTodoistTasks(mapped);
          checkDeadlinesAndNotify(mapped);
        }
      } catch (err) {
        console.error("Failed to load Todoist tasks:", err);
      } finally {
        setLoadingTodoist(false);
      }
    };
    fetchTodoistTasks();
  }, [user]);

  // Toggle Todoist task completion (Close on Todoist)
  const handleToggleTodoist = async (id: string) => {
    const target = todoistTasks.find(t => t.id === id);
    if (!target || !todoistToken || !target.rawTodoistId) return;

    // Toggle completed state locally
    setTodoistTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

    try {
      // Post close task to Todoist REST API
      const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${target.rawTodoistId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${todoistToken}`
        }
      });
      if (!res.ok) {
        // Revert local changes if API call failed
        setTodoistTasks(prev => prev.map(t => t.id === id ? { ...t, completed: t.completed } : t));
        console.error("Failed to close Todoist task on API");
      }
    } catch (err) {
      setTodoistTasks(prev => prev.map(t => t.id === id ? { ...t, completed: t.completed } : t));
      console.error("Error closing Todoist task:", err);
    }
  };

  // Delete Todoist task (Delete on Todoist)
  const handleDeleteTodoist = async (id: string) => {
    const target = todoistTasks.find(t => t.id === id);
    if (!target || !todoistToken || !target.rawTodoistId) return;

    // Filter out locally
    setTodoistTasks(prev => prev.filter(t => t.id !== id));

    try {
      const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${target.rawTodoistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${todoistToken}`
        }
      });
      if (!res.ok) {
        console.error("Failed to delete Todoist task on API");
      }
    } catch (err) {
      console.error("Error deleting Todoist task:", err);
    }
  };

  // Combine tasks
  const allTasks = [...tasks, ...todoistTasks];

  const completedCount = allTasks.filter(t => t.completed).length;
  const totalCount = allTasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-brand-accent-emerald shrink-0">
            <ListTodo className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold font-sans text-foreground truncate">{t('today.tasks_title')}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">
              {loadingTodoist ? (
                <span className="flex items-center gap-1 text-[10px] text-brand-accent-emerald">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Synchronisation Todoist...
                </span>
              ) : (
                t('today.tasks_desc')
              )}
            </CardDescription>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full">
              {completedCount}/{totalCount} ({completionPercentage}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <TodayTasksList 
          tasks={allTasks} 
          onToggleTodoist={handleToggleTodoist}
          onDeleteTodoist={handleDeleteTodoist}
        />
      </CardContent>
    </Card>
  );
}
export default TodayTasksCard;
