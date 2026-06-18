export interface InboxThread {
  leadId: string;
  leadName: string;
  contactEmail: string;
  gmailThreadId: string;
  replyStatus: string | null;
  replyDetectedAt: string | null;
  leadStatus: string;
  campaignId: string | null;
  snippet: string;
  lastMessageDate: string;
  messageCount: number;
  hasUnread: boolean;
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
