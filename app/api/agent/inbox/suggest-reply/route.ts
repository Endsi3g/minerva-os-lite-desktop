import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function verifyServiceToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.HERMES_SERVICE_TOKEN || '';
  if (!expectedToken) return false;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === expectedToken;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyServiceToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, context } = await req.json();
    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get lead profile connected to this thread
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('gmail_thread_id', threadId)
      .maybeSingle();

    if (leadError) throw leadError;

    // Default simulated suggestions based on context
    const isPositive = context?.toLowerCase().includes('oui') || context?.toLowerCase().includes('mardi') || context?.toLowerCase().includes('intéressé');
    
    const suggestions = isPositive ? [
      {
        type: 'meeting_proposal',
        subject: `Re: Partenariat local - ${lead?.business_name || 'Votre entreprise'}`,
        body: `Bonjour ${lead?.contact_name || 'Gérant'},\n\nMerci pour votre retour positif ! Ce serait avec plaisir. Je vous propose de nous appeler ce mardi à 10h ou 14h selon votre préférence.\n\nBonne journée,\nL'équipe Minerva`,
      },
      {
        type: 'more_details',
        subject: `Re: Partenariat local - ${lead?.business_name || 'Votre entreprise'}`,
        body: `Bonjour ${lead?.contact_name || 'Gérant'},\n\nParfait ! Je vous joins notre audit SEO technique complet afin que vous puissiez en prendre connaissance avant notre échange de mardi.\n\nCordialement,\nL'équipe Minerva`,
      }
    ] : [
      {
        type: 'standard_followup',
        subject: `Re: Partenariat local - ${lead?.business_name || 'Votre entreprise'}`,
        body: `Bonjour ${lead?.contact_name || 'Gérant'},\n\nJe me permets de faire suite à mon précédent e-mail. Avez-vous eu le temps d'étudier nos recommandations pour optimiser votre visibilité locale ?\n\nBien cordialement,\nL'équipe Minerva`,
      }
    ];

    return NextResponse.json({
      threadId,
      lead: lead ? { id: lead.id, businessName: lead.business_name } : null,
      suggestions,
    });
  } catch (err: any) {
    console.error('[agent-inbox-suggest-reply]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
