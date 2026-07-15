export interface Note {
  id: string;
  leadId: string;
  type: 'visit' | 'call' | 'email' | 'general';
  content: string;
  createdAt: string;
}

export interface LeadLocation {
  address: string;
  lat?: number;
  lng?: number;
}

export interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  contactEmail?: string;
  niche: string;
  city: string;
  source: string;
  status: 'New' | 'Contacted' | 'Meeting Booked' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
  temperature: 'Hot' | 'Warm' | 'Cold';
  nextAction: string;
  nextActionDate: string; // ISO date string (YYYY-MM-DD)
  notes: Note[];
  owner: string;
  imageUrl?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
  // Enrichment fields (Phase 3)
  website?: string;
  websiteDescription?: string;
  rating?: number;
  reviewsCount?: number;
  mapsUrl?: string;
  address?: string;
  locations?: LeadLocation[];
  photos?: string[];
  socialLinks?: Record<string, string>;
  assignedTo?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  // Qualification & enrichissement (v2.34.0)
  fitScore?: number;
  intentScore?: number;
  bantBudget?: boolean;
  bantAuthority?: boolean;
  bantNeed?: boolean;
  bantTiming?: boolean;
  suggestedEmails?: string[];
  decisionMakerName?: string;
  decisionMakerRole?: string;
  // Suggestion de recherche web approfondie en attente de validation (v14.2)
  enrichmentReview?: {
    confidence: number;
    reasoning: string;
    sourceUrl?: string;
    candidate: { website?: string; phone?: string; address?: string; socialLinks?: Record<string, string> };
    foundAt: string;
  };
  // Deal (v2.36.0)
  dealAmount?: number;
  dealProbability?: number;
  dealClosingDate?: string;
  // Campaign link (v2.35.0)
  campaignId?: string;
  // Activity tracking
  lastActivityAt?: string;
  replyDetectedAt?: string;
  gmailThreadId?: string;
  replyStatus?: 'positive' | 'followup' | 'negative' | null;
  // Acquisition v4.1
  leadSourceType?: 'osm' | 'csv' | 'manual' | 'form' | 'facebook' | 'google' | 'import';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  // Scoring v2 (v4.4)
  scoreIcp?: number;        // 0-25 — data completeness + ICP match
  scoreEngagement?: number; // 0-25 — pipeline stage + temperature
  scoreUrgency?: number;    // 0-25 — next action recency + freshness
  scoreRevenue?: number;    // 0-25 — business size + enrichment signals
  // Déduplication (v4.5)
  isDuplicate?: boolean;
  duplicateGroupId?: string;
  mergedFromIds?: string[];
  // Ads attribution (v4.5)
  fbAdsetId?: string;
  fbAdId?: string;
  fbFormId?: string;
  fbCampaignId?: string;
  gclid?: string;
  googleCampaignId?: string;
  googleAdGroupId?: string;
  googleKeyword?: string;
  landingPage?: string;
  firstTouchSource?: string;
  lastTouchSource?: string;
  // Advanced enrichment (v4.5)
  enrichedLogo?: string;
  companySizeEstimate?: 'solo' | 'small' | 'medium' | 'large';
  techStack?: string[];
  webPresenceScore?: number; // 0-100
  enrichedAt?: string;
  // Speed-to-lead (v4.5)
  firstContactAt?: string;
  slaStatus?: 'ok' | 'warning' | 'breach';
  // Reply classification (v4.5)
  replyClassification?: 'positive' | 'negative' | 'info_request' | 'scheduling' | 'out_of_office' | 'bounce' | 'not_right_person' | 'reschedule';
  replyClassifiedAt?: string;
  // Project association (v4.6)
  projectId?: string;
  // Tags (v4.0)
  tags?: string[];
  customFields?: Record<string, string>;
  // Google Places enrichment (v3.88.0)
  googlePlaceId?: string;
  googlePlaceData?: GooglePlaceData;
}

export interface GooglePlaceReview {
  text: string;
  rating: number;
  time: string;
  authorName?: string;
  authorPhotoUrl?: string;
}

export interface GooglePlaceData {
  place_id?: string;
  name?: string;
  rating?: number;
  review_count?: number;
  editorial_summary?: string | null;
  generative_summary?: string | null;
  reviews?: GooglePlaceReview[];
  // Places API photo resource names (e.g. "places/XXX/photos/YYY") — never a direct URL,
  // fetched through /api/leads/[id]/place-photo so GOOGLE_PLACES_API_KEY stays server-only.
  photos?: string[];
  opening_hours?: { openNow?: boolean; weekdayDescriptions?: string[] } | null;
  website?: string | null;
  phone?: string | null;
  insights?: string[];
  allows_dogs?: boolean | null;
  accessibility_options?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  } | null;
  ev_charging_options?: {
    connectorCount?: number;
    connectorAggregation?: Array<{
      connectorType?: string;
      maxChargeRateKw?: number;
      count?: number;
    }>;
  } | null;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  workspaceId: string;
  userId?: string;
  eventType: 'created' | 'status_changed' | 'email_sent' | 'reply' | 'call' | 'visit' | 'note' | 'meeting' | 'task' | 'enrichment' | 'score_updated' | 'campaign_step' | 'booking';
  title?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  type: 'email' | 'delay' | 'task' | 'condition' | 'call' | 'sms' | 'ab_test';
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  delayDays?: number;
  taskTitle?: string;
  taskCategory?: string;
  callScript?: string;
  smsText?: string;
  condition?: {
    on: 'reply' | 'open' | 'click' | 'booking' | 'positive_reply' | 'negative_reply';
    then: 'stop' | 'next' | string;
    else: 'next' | 'stop' | string;
  };
  abVariants?: Array<{ id: string; subject: string; bodyHtml: string; weight: number }>;
  pauseOnReply?: boolean;
  sendWindow?: { start: string; end: string };
}

export interface MarketingAttribution {
  leadId: string;
  source: string;
  medium?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  keyword?: string;
  landingPage?: string;
  touchType: 'first' | 'last' | 'assisted';
  touchedAt: string;
  dealAmount?: number;
}

export interface FacebookLeadAd {
  id: string;
  workspaceId: string;
  pageId: string;
  pageName: string;
  formId: string;
  formName: string;
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  status: 'active' | 'paused' | 'disconnected';
  leadsCount: number;
  connectedAt: string;
}

export interface GoogleAdsCampaign {
  id: string;
  workspaceId: string;
  campaignId: string;
  campaignName: string;
  adGroupId?: string;
  adGroupName?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  status: 'active' | 'paused';
  connectedAt: string;
}

export interface SequenceTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  status: 'active' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollment {
  id: string;
  templateId?: string;
  leadId: string;
  workspaceId: string;
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'stopped' | 'replied';
  nextActionAt?: string;
  enrolledAt: string;
  completedAt?: string;
}

export interface EmailQueueItem {
  id: string;
  workspaceId: string;
  leadId?: string;
  enrollmentId?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: 'Follow-up' | 'Preparation' | 'General' | 'Meeting';
  dueDate: string;
  description?: string;
  isTodoist?: boolean;
  rawTodoistId?: string;
  leadId?: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface AiSuggestion {
  id: string;
  leadId: string;
  leadName: string;
  actionText: string;
  suggestedChannel: 'Email' | 'DM' | 'Call';
  reasoning: string;
  draftPrompt: string;
}

