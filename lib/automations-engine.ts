import { createClient } from './supabase/client';
import { Lead } from './mock-data';

export type TriggerType = 'lead_updated' | 'lead_replied' | 'intent_increased' | 'webhook_received' | 'time_passed';

export type Condition = {
  field: keyof Lead | string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value: any;
};

export type Action = {
  type: 'create_task' | 'add_to_campaign' | 'update_lead_status' | 'send_email' | 'send_slack' | 'notify';
  payload: Record<string, any>;
};

export type Automation = {
  id: string;
  workspaceId: string;
  name: string;
  triggerType: TriggerType;
  conditions: Condition[];
  actions: Action[];
  isActive: boolean;
};

function evaluateCondition(lead: Record<string, any>, condition: Condition): boolean {
  const actualValue = lead[condition.field];
  switch (condition.operator) {
    case 'equals': return actualValue === condition.value;
    case 'not_equals': return actualValue !== condition.value;
    case 'greater_than': return actualValue > condition.value;
    case 'less_than': return actualValue < condition.value;
    case 'contains': return typeof actualValue === 'string' && actualValue.includes(condition.value);
    case 'is_empty': return actualValue === null || actualValue === undefined || actualValue === '';
    case 'is_not_empty': return actualValue !== null && actualValue !== undefined && actualValue !== '';
    default: return false;
  }
}

export async function processAutomations(workspaceId: string, trigger: TriggerType, leadData: Record<string, any>) {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  let automations: Automation[] = [];

  if (isElectron) {
    try {
      const rows = await (window as any).electron.dbAll(
        `SELECT * FROM automations WHERE workspace_id = ? AND trigger_type = ? AND is_active = 1`,
        [workspaceId, trigger]
      );
      automations = rows.map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        name: r.name,
        triggerType: r.trigger_type,
        conditions: JSON.parse(r.conditions || '[]'),
        actions: JSON.parse(r.actions || '[]'),
        isActive: Boolean(r.is_active)
      }));
    } catch (e) {
      console.error("Error loading local automations:", e);
    }
  } else {
    // Web fallback
    const supabase = createClient();
    const { data } = await supabase
      .from('automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('trigger_type', trigger)
      .eq('is_active', true);
      
    if (data) {
      automations = data.map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        name: r.name,
        triggerType: r.trigger_type,
        conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
        isActive: r.is_active
      }));
    }
  }

  for (const automation of automations) {
    // Evaluate conditions (AND logic)
    const allMatch = automation.conditions.every(cond => evaluateCondition(leadData, cond));
    
    if (allMatch) {
      console.log(`[Automations] Triggering workflow: ${automation.name}`);
      
      // Execute actions
      for (const action of automation.actions) {
        try {
          await executeAction(workspaceId, action, leadData, automation.id);
        } catch (e) {
          console.error(`[Automations] Action failed in workflow ${automation.name}:`, e);
          await logAutomationEvent(automation.id, workspaceId, trigger, 'error', String(e));
        }
      }
      
      await logAutomationEvent(automation.id, workspaceId, trigger, 'success', null);
    }
  }
}

async function executeAction(workspaceId: string, action: Action, context: Record<string, any>, automationId: string) {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const now = new Date().toISOString();
  
  switch (action.type) {
    case 'create_task':
      const taskId = crypto.randomUUID();
      const title = action.payload.title.replace('{{leadName}}', context.businessName || 'Lead');
      if (isElectron) {
        await (window as any).electron.dbRun(
          `INSERT INTO tasks (id, user_id, workspace_id, title, category, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [taskId, context.user_id || context.userId || 'system', workspaceId, title, action.payload.category || 'General', now]
        );
        if ((window as any).electron.triggerSync) (window as any).electron.triggerSync();
      }
      break;
      
    case 'update_lead_status':
      if (context.id && isElectron) {
        await (window as any).electron.dbRun(
          `UPDATE leads SET status = ?, sync_status = 'pending_update' WHERE id = ?`,
          [action.payload.status, context.id]
        );
        if ((window as any).electron.triggerSync) (window as any).electron.triggerSync();
      }
      break;
      
    case 'notify':
      const notifId = crypto.randomUUID();
      const msg = action.payload.message.replace('{{leadName}}', context.businessName || 'Lead');
      if (isElectron) {
        await (window as any).electron.dbRun(
          `INSERT INTO notifications (id, user_id, workspace_id, type, title, body, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [notifId, context.user_id || context.userId || 'system', workspaceId, 'info', 'Automation: ' + msg, msg, now]
        );
        if ((window as any).electron.triggerSync) (window as any).electron.triggerSync();
      }
      break;
  }
}

async function logAutomationEvent(automationId: string, workspaceId: string, triggerEvent: string, status: string, error: string | null) {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const logId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  if (isElectron) {
    try {
      await (window as any).electron.dbRun(
        `INSERT INTO automation_logs (id, automation_id, workspace_id, trigger_event, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [logId, automationId, workspaceId, triggerEvent, status, error, now]
      );
    } catch (e) {}
  }
}

export const defaultAutomations = [
  {
    name: "Relance si pas de réponse",
    triggerType: "time_passed",
    conditions: [
      { field: "replyStatus", operator: "is_empty", value: null },
      { field: "status", operator: "equals", value: "Contacted" }
    ],
    actions: [
      { type: "create_task", payload: { title: "Relancer {{leadName}}", category: "Follow-up" } }
    ]
  },
  {
    name: "Alerte Lead Chaud",
    triggerType: "intent_increased",
    conditions: [
      { field: "intentScore", operator: "greater_than", value: 80 }
    ],
    actions: [
      { type: "notify", payload: { message: "Le lead {{leadName}} est très chaud (Intent > 80)." } }
    ]
  },
  {
    name: "Tâche si Réponse Positive",
    triggerType: "lead_replied",
    conditions: [
      { field: "replyStatus", operator: "equals", value: "positive" }
    ],
    actions: [
      { type: "create_task", payload: { title: "Appeler {{leadName}} suite à réponse positive", category: "Meeting" } },
      { type: "update_lead_status", payload: { status: "Meeting Booked" } }
    ]
  }
];
