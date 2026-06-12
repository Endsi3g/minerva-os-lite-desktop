'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TodayTasksList } from './today-tasks-list';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { ListTodo } from 'lucide-react';

export function TodayTasksCard() {
  const { tasks } = useReach();
  const { t } = useLanguage();

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.tasks_title')}</CardTitle>
            <CardDescription className="text-xs">{t('today.tasks_desc')}</CardDescription>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {completedCount}/{totalCount} ({completionPercentage}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <TodayTasksList tasks={tasks} />
      </CardContent>
    </Card>
  );
}
export default TodayTasksCard;
