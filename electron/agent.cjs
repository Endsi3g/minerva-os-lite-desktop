const { ipcMain } = require('electron');
const db = require('./database.cjs');
const sync = require('./sync.cjs');

// This is the internal background agent that orchestrates Minerva
let agentInterval = null;
let isAgentRunning = false;

async function runAgentTick() {
  if (isAgentRunning) return;
  isAgentRunning = true;
  
  try {
    console.log("[Minerva Agent] Tick started...");
    
    // 1. Fetch active workspaces
    const workspaces = await db.all(`SELECT id FROM workspaces`);
    if (!workspaces || workspaces.length === 0) {
      isAgentRunning = false;
      return;
    }
    
    for (const ws of workspaces) {
      const workspaceId = ws.id;
      
      // 2. Fetch active automations for this workspace
      const automations = await db.all(
        `SELECT * FROM automations WHERE workspace_id = ? AND is_active = 1`,
        [workspaceId]
      );
      
      if (!automations || automations.length === 0) continue;
      
      // We only simulate "time_passed" triggers in the background
      const timeAutomations = automations.filter(a => a.trigger_type === 'time_passed');
      
      if (timeAutomations.length > 0) {
        // Fetch leads
        const leads = await db.all(`SELECT * FROM leads WHERE workspace_id = ?`, [workspaceId]);
        
        for (const lead of leads) {
          for (const automation of timeAutomations) {
            const conditions = JSON.parse(automation.conditions || '[]');
            const actions = JSON.parse(automation.actions || '[]');
            
            // Basic condition evaluation
            let allMatch = true;
            for (const cond of conditions) {
              const actualValue = lead[cond.field];
              switch(cond.operator) {
                case 'equals': 
                  if (actualValue !== cond.value) allMatch = false; 
                  break;
                case 'is_empty': 
                  if (actualValue !== null && actualValue !== undefined && actualValue !== '') allMatch = false; 
                  break;
                default: 
                  allMatch = false;
              }
            }
            
            if (allMatch) {
              // Execute Actions
              for (const action of actions) {
                if (action.type === 'create_task') {
                  const taskId = require('crypto').randomUUID();
                  const title = action.payload.title.replace('{{leadName}}', lead.business_name || 'Lead');
                  await db.run(
                    `INSERT INTO tasks (id, user_id, workspace_id, title, category, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, 'pending_insert')`,
                    [taskId, lead.user_id, workspaceId, title, action.payload.category || 'General', new Date().toISOString()]
                  );
                }
              }
              
              // Log execution
              const logId = require('crypto').randomUUID();
              await db.run(
                `INSERT INTO automation_logs (id, automation_id, workspace_id, trigger_event, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                [logId, automation.id, workspaceId, 'time_passed', 'success', new Date().toISOString()]
              );
              
              // Force sync
              sync.triggerSync();
            }
          }
        }
      }
    }
    
    console.log("[Minerva Agent] Tick completed.");
  } catch (error) {
    console.error("[Minerva Agent] Error during tick:", error);
  } finally {
    isAgentRunning = false;
  }
}

function startAgent() {
  if (agentInterval) return;
  console.log("[Minerva Agent] Starting internal agent (runs every 5 minutes)...");
  // Run every 5 minutes
  agentInterval = setInterval(runAgentTick, 5 * 60 * 1000);
  
  // Initial run after a short delay
  setTimeout(runAgentTick, 30000);
}

function stopAgent() {
  if (agentInterval) {
    clearInterval(agentInterval);
    agentInterval = null;
    console.log("[Minerva Agent] Internal agent stopped.");
  }
}

module.exports = {
  startAgent,
  stopAgent,
  runAgentTick
};
