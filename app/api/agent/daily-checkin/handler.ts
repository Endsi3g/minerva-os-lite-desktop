import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspaceId, teamStats, customNotes, language = 'fr' } = body;

    const supabase = await createClient();

    // 1. Fetch real workspace CRM data if workspaceId is provided
    let leadsCount = 0;
    let hotLeadsCount = 0;
    let overdueLeadsCount = 0;
    let contactedCount = 0;
    let repliesCount = 0;
    let sampleHotLeads: Array<{ businessName: string; niche?: string; city?: string; nextAction?: string }> = [];

    if (workspaceId) {
      try {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, business_name, niche, city, status, temperature, next_action, next_action_date')
          .eq('workspace_id', workspaceId)
          .limit(200);

        if (leads && leads.length > 0) {
          leadsCount = leads.length;
          const todayStr = new Date().toISOString().split('T')[0];
          
          hotLeadsCount = leads.filter(l => l.temperature === 'Hot').length;
          overdueLeadsCount = leads.filter(l => l.next_action_date && l.next_action_date <= todayStr && l.status !== 'Won' && l.status !== 'Lost').length;
          contactedCount = leads.filter(l => l.status === 'Contacted' || l.status === 'In_Discussion').length;
          
          sampleHotLeads = leads
            .filter(l => l.temperature === 'Hot')
            .slice(0, 5)
            .map(l => ({
              businessName: l.business_name,
              niche: l.niche,
              city: l.city,
              nextAction: l.next_action,
            }));
        }
      } catch (err) {
        console.warn('Could not query leads for daily checkin:', err);
      }
    }

    // Use passed stats if available
    if (teamStats) {
      if (teamStats.leadsCount) leadsCount = teamStats.leadsCount;
      if (teamStats.hotLeadsCount) hotLeadsCount = teamStats.hotLeadsCount;
      if (teamStats.overdueLeadsCount) overdueLeadsCount = teamStats.overdueLeadsCount;
      if (teamStats.contactedCount) contactedCount = teamStats.contactedCount;
      if (teamStats.repliesCount) repliesCount = teamStats.repliesCount;
    }

    const todayDate = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const systemPrompt = `Tu es le Head of Sales & SDR AI Manager de Minerva OS.
Ton rôle est de délivrer chaque jour un **Daily Standup & Bilan des Performances de l'Équipe** avec un diagnostic sans langue de bois, des métriques claires, 3 à 5 conseils de coaching commercial ultra-actionnables, et un plan d'actions immédiat exécutable.

Règles de style :
- Direct, percutant, motivant et axé sur les résultats (Closing & MRR).
- Structure toujours en 4 sections distinctes :
  1. 📊 **Bilan & Métriques de l'Équipe** (Volume, vélocité, opportunités chaudes).
  2. ⚠️ **Goulots d'étranglement & Alertes** (Relances en retard, leads froids à requalifier).
  3. 🎯 **Conseils Tactiques & Coaching SDR du Jour** (3 à 5 tactiques précises de relance, gestion d'objections ou accroche).
  4. ⚡ **Plan d'Action Immédiat (1-Click)** avec bloc \`\`\`minerva-action.`;

    const userPrompt = `Génère le Daily Check-in d'équipe pour la date du ${todayDate}.

Données réelles du workspace :
- Total Leads : ${leadsCount}
- Leads Chauds (Haute intention) : ${hotLeadsCount}
- Actions / Relances en retard : ${overdueLeadsCount}
- Prospects en cours de discussion : ${contactedCount}
- Réponses reçues récentes : ${repliesCount || 'En cours de suivi'}
- Top Leads Chauds : ${JSON.stringify(sampleHotLeads)}
${customNotes ? `- Notes additionnelles de l'équipe : ${customNotes}` : ''}

Inclus un graphique \`\`\`chart pour résumer le pipeline et 1 ou 2 blocs \`\`\`minerva-action pour exécuter les priorités de la journée.`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 3500,
    });

    return NextResponse.json({
      success: true,
      date: todayDate,
      checkinMarkdown: result,
      stats: {
        leadsCount,
        hotLeadsCount,
        overdueLeadsCount,
        contactedCount,
      },
    });
  } catch (error: any) {
    console.error('Error in daily checkin API:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors du Daily Check-in' },
      { status: 500 }
    );
  }
}
