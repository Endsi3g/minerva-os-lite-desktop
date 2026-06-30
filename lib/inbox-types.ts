export type ReplyIntent = 'interested' | 'not_interested' | 'scheduling' | 'info_request' | 'objection' | 'other';

export interface InboxThread {
  leadId: string | null;
  leadName: string | null;
  fromName: string;
  contactEmail: string;
  subject: string;
  gmailThreadId: string;
  replyStatus: string | null;
  replyDetectedAt: string | null;
  leadStatus: string | null;
  campaignId: string | null;
  snippet: string;
  lastMessageDate: string;
  messageCount: number;
  hasUnread: boolean;
  isLeadLinked: boolean;
  replyIntent: ReplyIntent | null;
  intentConfidence: number | null;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isFromUser: boolean;
}
