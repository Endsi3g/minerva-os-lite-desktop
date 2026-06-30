import { isNativePlatform } from './native-bridge';

export interface WidgetData {
  totalLeads: number;
  hotLeads: number;
  tasksToday: number;
  leadsAddedToday: number;
  nextActionType: 'call' | 'email' | 'visit' | 'task' | '';
  nextActionLead: string;
  nextActionDetail: string;
}

let plugin: { updateData: (d: WidgetData) => Promise<void>; reloadWidget: () => Promise<void> } | null = null;

async function getPlugin() {
  if (!isNativePlatform()) return null;
  if (plugin) return plugin;
  try {
    const { registerPlugin } = await import('@capacitor/core');
    plugin = registerPlugin<typeof plugin>('MinervaWidget', { web: () => null });
    return plugin;
  } catch {
    return null;
  }
}

export async function updateWidget(data: WidgetData): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.updateData(data);
  } catch (err) {
    console.warn('[widget-bridge] updateData failed:', err);
  }
}

export async function reloadWidget(): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.reloadWidget();
  } catch (err) {
    console.warn('[widget-bridge] reloadWidget failed:', err);
  }
}
