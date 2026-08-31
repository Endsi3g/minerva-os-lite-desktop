'use client';

import { ArrowDown, MessageSquareWarning, CheckCircle2, Sparkles, Target } from 'lucide-react';

export type FlowchartNodeType = 'hook' | 'value' | 'objection' | 'response' | 'closing';

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  label?: string;
  text: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
}

export interface ScriptFlowchart {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

const TYPE_ICON: Record<FlowchartNodeType, typeof Target> = {
  hook: Sparkles,
  value: Target,
  objection: MessageSquareWarning,
  response: MessageSquareWarning,
  closing: CheckCircle2,
};

function Card({ node, accent }: { node: FlowchartNode; accent?: boolean }) {
  const Icon = TYPE_ICON[node.type] || Target;
  return (
    <div
      className="rounded-xl p-4 bg-white text-left"
      style={{ border: `1px solid ${accent ? '#059669' : '#e5e5e0'}` }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">
        <Icon className="h-3 w-3" style={accent ? { color: '#059669' } : undefined} />
        {node.label || node.type}
      </div>
      <p className="text-xs text-[#26251e] leading-relaxed">{node.text}</p>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-4 w-4 text-[#c9c9c3]" />
    </div>
  );
}

/**
 * Renders the AI-generated {nodes, edges} decision tree (hook → value →
 * objection/response branches → closing) as a vertical flow. Custom, no
 * charting dependency — the schema is small and fixed enough that a generic
 * graph-layout library would be overkill.
 */
export function CallScriptFlowchart({ flowchart }: { flowchart: ScriptFlowchart }) {
  const nodes = flowchart?.nodes || [];
  const edges = flowchart?.edges || [];

  const hook = nodes.find((n) => n.type === 'hook');
  const value = nodes.find((n) => n.type === 'value');
  const closing = nodes.find((n) => n.type === 'closing');
  const objections = nodes.filter((n) => n.type === 'objection');
  const responses = nodes.filter((n) => n.type === 'response');

  const pairs = objections.map((obj, i) => {
    const edge = edges.find((e) => e.from === obj.id);
    const response = (edge && responses.find((r) => r.id === edge.to)) || responses[i] || null;
    return { objection: obj, response };
  });

  if (!hook && !value && !closing && pairs.length === 0) {
    return (
      <p className="text-xs text-[#7a7a76] italic">
        Script graphique indisponible — réessaie en mode texte.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {hook && <Card node={hook} accent />}
      {hook && value && <Connector />}
      {value && <Card node={value} accent />}

      {pairs.length > 0 && (
        <>
          {value && <Connector />}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] text-center pb-2">
            Objections probables
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(pairs.length, 3)}, minmax(0, 1fr))` }}>
            {pairs.map(({ objection, response }) => (
              <div key={objection.id} className="space-y-0">
                <Card node={objection} />
                {response && (
                  <>
                    <Connector />
                    <Card node={response} />
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {closing && (pairs.length > 0 || value) && <Connector />}
      {closing && <Card node={closing} accent />}
    </div>
  );
}
