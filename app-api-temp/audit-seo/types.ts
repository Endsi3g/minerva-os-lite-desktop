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
}

export interface SeoAuditError {
  url: string;
  score: 0;
  error: 'unreachable';
}
