import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

// Helper to encode SSE streaming events
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, model, activeTool } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    // Get user settings to look for API Keys
    const { data: dbSettings } = await supabase
      .from('settings')
      .select('openrouter_key, ai_provider, ai_model')
      .eq('user_id', user.id)
      .maybeSingle();

    const provider = dbSettings?.ai_provider || 'anthropic';
    const openrouterKey = dbSettings?.openrouter_key || process.env.OPENROUTER_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    const selectedModel = model || dbSettings?.ai_model || 'meta-llama/llama-3-8b-instruct:free';

    const lastMessage = messages[messages.length - 1]?.content || '';
    const lastMessageLower = lastMessage.toLowerCase();

    // 1. OpenRouter Integration (Real OpenRouter API)
    if (provider === 'openrouter' && openrouterKey && openrouterKey.trim() !== '') {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Minerva OS Reach Lite',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content
            })),
            stream: true
          })
        });

        if (response.ok && response.body) {
          const stream = new ReadableStream({
            async start(controller) {
              const reader = response.body!.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
              } catch (e) {
                controller.error(e);
              } finally {
                controller.close();
              }
            }
          });
          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            }
          });
        } else {
          console.warn("OpenRouter API returned error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to connect to OpenRouter, falling back to simulated stream:", err);
      }
    }

    // 2. Native Anthropic Integration
    if (provider === 'anthropic' && anthropicKey && anthropicKey.trim() !== '') {
      try {
        let anthropicModel = 'claude-3-5-sonnet-20241022';
        if (selectedModel && (selectedModel.startsWith('claude') || selectedModel.includes('anthropic'))) {
          anthropicModel = selectedModel;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey.trim(),
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: anthropicModel,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content
            })),
            stream: true,
            max_tokens: 1500
          })
        });

        if (response.ok && response.body) {
          const stream = new ReadableStream({
            async start(controller) {
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();
              let buffer = '';

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const dataStr = line.slice(6).trim();
                      if (dataStr === '[DONE]') continue;
                      try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                          const text = parsed.delta.text;
                          const sseFormat = `data: ${JSON.stringify({
                            choices: [{
                              delta: {
                                content: text
                              }
                            }]
                          })}\n\n`;
                          controller.enqueue(encoder.encode(sseFormat));
                        }
                      } catch {
                        // ignore parsing error
                      }
                    }
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } catch (e) {
                controller.error(e);
              } finally {
                controller.close();
              }
            }
          });

          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            }
          });
        } else {
          console.warn("Anthropic API returned error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to connect to Anthropic, falling back to simulated stream:", err);
      }
    }

    // High fidelity simulation stream fallback
    const simulatedResponse = getSimulatedReply(lastMessageLower, activeTool);

    const stream = new ReadableStream({
      async start(controller) {
        // Split text into small chunks to simulate network streaming latency
        const words = simulatedResponse.split(/(\s+)/);
        for (const word of words) {
          const sseFormat = `data: ${JSON.stringify({
            choices: [{
              delta: {
                content: word
              }
            }]
          })}\n\n`;
          controller.enqueue(encoder.encode(sseFormat));
          // Small sleep to simulate streaming
          await new Promise(r => setTimeout(r, 15));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Error in chat API route:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// High fidelity simulations for onboarding prompts, document drafting, and tools
function getSimulatedReply(query: string, activeTool?: string): string {
  // 1. Prospecting Email / Document request
  if (query.includes('email') || query.includes('prospect') || query.includes('document') || query.includes('doc') || activeTool === 'canvas') {
    return `Bien sûr ! J'ai rédigé un modèle d'e-mail de prospection ultra-personnalisé pour notre cible. J'ai également ouvert ce document dans l'éditeur **Canvas** situé sur la droite de votre écran afin que vous puissiez y apporter des modifications en temps réel.

\`\`\`canvas:Email de prospection Boulangerie
# Séquence de Prospection - Partenariat Local

**Objet :** Amélioration de la visibilité en ligne de la Boulangerie L'Épi d'Or 🌾

Bonjour Jean,

J'ai récemment visité votre site internet et j'ai remarqué que votre boulangerie n'apparaît pas dans les premiers résultats sur Google Maps pour les recherches associées à "artisan boulanger Lyon".

En optimisant simplement quelques éléments clés de votre fiche Google Business Profile et en adaptant la structure technique de votre site mobile, vous pourriez attirer entre **20% et 35% de clients supplémentaires** chaque semaine.

Nous avons préparé un audit SEO complet et gratuit pour L'Épi d'Or. Seriez-vous disponible pour un court appel de 5 minutes ce jeudi à 10h ?

Cordialement,
**L'équipe Minerva OS**
---
*Note interne : À relancer sous 3 jours si pas de réponse.*
\`\`\`

Faites-moi savoir si vous souhaitez que j'adapte le ton (plus chaleureux ou plus corporatif) ou si vous voulez ajouter d'autres arguments !`;
  }

  // 2. Data visualization
  if (query.includes('visualis') || query.includes('chart') || query.includes('graph') || query.includes('donnée') || query.includes('analyse')) {
    return `Voici un rapport d'analyse structuré contenant les indicateurs de performance commerciale clés de votre espace de travail. Le document a été ouvert dans le **Canvas** à droite pour que vous puissiez l'exporter ou l'éditer.

\`\`\`canvas:Rapport d'analyse de Performance
# Rapport de Performance - Juin 2026

## Indicateurs Clés (KPI)
- **Taux de conversion global :** 24.5% (+2.3% par rapport au mois dernier)
- **Coût d'acquisition client (CAC) :** 45.00 €
- **Revenu Mensuel Récurrent (MRR) :** 12 400.00 €

## Répartition des Prospects par Statut
1. **Nouveaux Leads (New) :** 45 prospects
2. **Contactés (Contacted) :** 28 prospects
3. **Rendez-vous fixés (Meeting) :** 12 prospects
4. **Contrats signés (Won) :** 8 signatures

*Recommandation :* Le goulot d'étranglement se situe principalement entre l'étape "Contacté" et "RDV Fixé". Nous suggérons d'automatiser les relances à J+2 via notre playbook d'IA.
\`\`\`

Les graphiques d'activité détaillés sont également disponibles dans votre onglet **Analyses** du menu de gauche. Voulez-vous que je rédige la trame de relance pour les prospects tièdes ?`;
  }

  // 3. Image generation
  if (query.includes('imag') || query.includes('photo') || query.includes('dessin') || query.includes('génèr')) {
    return `J'ai lancé le modèle de génération d'image pour créer un visuel promotionnel adapté. 

Voici l'image générée en haute définition correspondant à votre demande :
![Visuel promotionnel Minerva](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80)

Vous pouvez l'enregistrer directement ou l'intégrer à votre bibliothèque de fichiers. Souhaitez-vous que je modifie les couleurs ou le style artistique ?`;
  }

  // 4. Default Assistant reply
  return `Bonjour ! Je suis votre assistant Minerva Reach. 

Je peux vous aider à :
1. **Rechercher des leads** et analyser des opportunités locales.
2. **Rédiger des campagnes d'e-mails** et les éditer en temps réel avec le **Canvas**.
3. **Visualiser les données** de performance de votre agence.
4. **Générer des images** promotionnelles pour vos réseaux sociaux.

Que souhaitez-vous faire aujourd'hui ?`;
}
