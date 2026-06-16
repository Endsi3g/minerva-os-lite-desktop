import { Lead } from '@/lib/mock-data';

export const getTemperatureStyle = (temp: Lead['temperature']) => {
  switch (temp) {
    case 'Hot':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'Warm':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'Cold':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const getTemperatureLabel = (temp: Lead['temperature']) => {
  switch (temp) {
    case 'Hot': return '🔥 Chaud';
    case 'Warm': return '☀️ Tiède';
    case 'Cold': return '❄️ Froid';
    default: return temp;
  }
};
