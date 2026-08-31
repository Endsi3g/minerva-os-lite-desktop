export interface SeoAuditResult {
  url: string;
  loadTime: number;
  https: boolean;
  hasViewport: boolean;
  title: string | null;
  titleLength: number;
  hasTitle: boolean;
  descriptionContent: string | null;
  descriptionLength: number;
  hasDescription: boolean;
  hasGA: boolean;
  hasFBPixel: boolean;
  h1Count: number;
  score: number;
  issues: { label: string; severity: 'error' | 'warning' | 'info' }[];
  aiAnalysis?: {
    executiveSummary: string;
    strengths: string[];
    weaknesses: string[];
    actionPlan: string[];
    outreachPitch: string;
  } | string;
}

export interface SeoAuditError {
  url: string;
  score: 0;
  error: 'unreachable';
}
