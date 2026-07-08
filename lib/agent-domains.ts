import type { AgentAutonomy } from '@/app/(app)/settings/_components/settings-ai-section';

// Phase 4 des Programmes de croissance — organise les outils/actions de
// l'agent autonome unique existant (lib/agent-tools.ts) en 3 "équipes"
// nommées pour l'utilisateur, sans dupliquer l'infrastructure : Growth
// (pipeline/tâches/séquences), Outreach & Inbox (emails/relances/canaux),
// Terrain (tournées/visites). C'est une classification/étiquetage par-dessus
// agent_actions.action_type, pas un nouveau moteur d'agent séparé.

export type AgentTeamId = 'growth' | 'outreach' | 'terrain';

export interface AgentTeam {
  id: AgentTeamId;
  name: string;
  description: string;
  color: string;
  autonomyKeys: (keyof AgentAutonomy)[];
  actionTypes: string[];
}

export const AGENT_TEAMS: AgentTeam[] = [
  {
    id: 'growth',
    name: 'Growth',
    description: 'Programmes de croissance, pipeline et tâches de relance.',
    color: '#059669',
    autonomyKeys: ['tasks', 'pipeline', 'sequences'],
    actionTypes: [
      'create_task', 'update_pipeline_stage', 'tag_lead', 'trigger_enrichment',
      'summarize_pipeline', 'enroll_in_sequence', 'pipeline_nudge',
    ],
  },
  {
    id: 'outreach',
    name: 'Outreach & Inbox',
    description: 'Emails, relances, changement de canal, boîte de réception.',
    color: '#3b82f6',
    autonomyKeys: [
      'emails', 'outreach_draft', 'outreach_initial_send', 'outreach_followup',
      'outreach_reply', 'outreach_sequence_pause', 'outreach_pipeline_update',
    ],
    actionTypes: [
      'generate_email_draft', 'send_email', 'suggest_follow_up', 'classify_reply',
      'pause_sequence', 'resume_sequence', 'summarize_inbox', 'book_meeting',
      'adjust_template', 'switch_channel', 'email_followup', 'nurture',
    ],
  },
  {
    id: 'terrain',
    name: 'Terrain',
    description: 'Tournées, visites et comptes rendus de terrain.',
    color: '#8b5cf6',
    autonomyKeys: ['field'],
    actionTypes: ['plan_field_route'],
  },
];

const ACTION_TYPE_TO_TEAM: Record<string, AgentTeamId> = {};
for (const team of AGENT_TEAMS) {
  for (const actionType of team.actionTypes) {
    ACTION_TYPE_TO_TEAM[actionType] = team.id;
  }
}

export function getTeamForActionType(actionType: string): AgentTeamId | null {
  return ACTION_TYPE_TO_TEAM[actionType] ?? null;
}
