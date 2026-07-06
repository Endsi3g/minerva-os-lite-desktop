import type { Lead } from './mock-data';

export type SegmentOperator =
  | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';

export interface SegmentRule {
  field: keyof Lead | string;
  operator: SegmentOperator;
  value: string | number;
}

export interface LeadSegment {
  id: string;
  workspaceId: string;
  name: string;
  rules: SegmentRule[];
  createdAt: string;
}

export const SEGMENT_FIELDS: { value: string; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'temperature', label: 'Température (Hot/Warm/Cold)' },
  { value: 'status', label: 'Statut' },
  { value: 'niche', label: 'Secteur' },
  { value: 'city', label: 'Ville' },
  { value: 'tags', label: 'Tags' },
];

export const SEGMENT_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'contains', label: 'contient' },
  { value: 'is_empty', label: 'est vide' },
  { value: 'is_not_empty', label: "n'est pas vide" },
];

function evaluateRule(lead: Lead, rule: SegmentRule): boolean {
  const actual = (lead as unknown as Record<string, unknown>)[rule.field];
  switch (rule.operator) {
    case 'equals':
      return Array.isArray(actual) ? actual.includes(rule.value) : actual === rule.value || String(actual) === String(rule.value);
    case 'not_equals':
      return Array.isArray(actual) ? !actual.includes(rule.value) : actual !== rule.value && String(actual) !== String(rule.value);
    case 'greater_than':
      return Number(actual) > Number(rule.value);
    case 'less_than':
      return Number(actual) < Number(rule.value);
    case 'contains':
      return Array.isArray(actual)
        ? actual.some((v) => String(v).toLowerCase().includes(String(rule.value).toLowerCase()))
        : String(actual ?? '').toLowerCase().includes(String(rule.value).toLowerCase());
    case 'is_empty':
      return actual === null || actual === undefined || actual === '' || (Array.isArray(actual) && actual.length === 0);
    case 'is_not_empty':
      return !(actual === null || actual === undefined || actual === '' || (Array.isArray(actual) && actual.length === 0));
    default:
      return false;
  }
}

// Un lead appartient au segment s'il satisfait TOUTES les règles (ET logique).
export function matchesSegment(lead: Lead, rules: SegmentRule[]): boolean {
  if (rules.length === 0) return false;
  return rules.every((rule) => evaluateRule(lead, rule));
}

export function getSegmentMembers(leads: Lead[], rules: SegmentRule[]): Lead[] {
  return leads.filter((lead) => matchesSegment(lead, rules));
}
