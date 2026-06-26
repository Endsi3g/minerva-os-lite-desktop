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
