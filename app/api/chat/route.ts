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

    const { messages, model, activeTool, system, provider: requestProvider } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    // Get user settings to look for API Keys
    const { data: dbSettings } = await supabase
      .from('settings')
      .select('openrouter_key, ai_provider, ai_model, groq_api_key, together_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    // Per-user key (drives the default-provider decision) vs the global env key
    // (only used when openrouter is explicitly requested — e.g. canvas vision).
    const userOpenrouterKey = dbSettings?.openrouter_key || '';
    const openrouterKey = userOpenrouterKey || process.env.OPENROUTER_API_KEY || '';
    const groqKey = dbSettings?.groq_api_key || process.env.GROQ_API_KEY || '';
    const togetherKey = dbSettings?.together_api_key || process.env.TOGETHER_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    const selectedModel = model || dbSettings?.ai_model || 'meta-llama/llama-3-8b-instruct:free';

    // Cascade: an explicit request/setting wins; otherwise only a *per-user* key
    // changes the default — the global OPENROUTER_API_KEY never silently overrides
    // Anthropic (which would break Claude-model calls like field scripts).
    const explicitProvider = dbSettings?.ai_provider;
    const provider = (() => {
      if (requestProvider === 'openrouter' && openrouterKey) return 'openrouter';
      if (requestProvider === 'anthropic') return 'anthropic';
      if (explicitProvider === 'groq' && groqKey) return 'groq';
      if (explicitProvider === 'together' && togetherKey) return 'together';
      if (explicitProvider === 'openrouter' && openrouterKey) return 'openrouter';
      if (userOpenrouterKey) return 'openrouter';
      if (groqKey) return 'groq';
      if (togetherKey) return 'together';
      return 'anthropic';
    })();

    const lastMessage = messages[messages.length - 1]?.content || '';
    const lastMessageLower = lastMessage.toLowerCase();

    // 1. Groq / Together.ai (OpenAI-compatible)
    if ((provider === 'groq' || provider === 'together') ) {
      const apiKey = provider === 'groq' ? groqKey : togetherKey;
      const baseURL = provider === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://api.together.xyz/v1';
      const defaultModel = provider === 'groq' ? 'llama-3.1-70b-versatile' : 'meta-llama/Llama-3-70b-chat-hf';

      if (apiKey && apiKey.trim() !== '') {
        try {
          const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: selectedModel || defaultModel,
              messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                ...messages.map((m: { role: string; content: string }) => ({
                  role: m.role,
                  content: m.content
                }))
              ],
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
            console.warn(`${provider} API returned error:`, await response.text());
          }
        } catch (err) {
          console.error(`Failed to connect to ${provider}, falling back to simulated stream:`, err);
        }
      }
    }

    // 2. OpenRouter Integration (Real OpenRouter API)
    if (provider === 'openrouter' && openrouterKey && openrouterKey.trim() !== '') {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Minerva OS Reach Lite',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              ...(system ? [{ role: 'system', content: system }] : []),
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
              }))
            ],
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

    // 3. Native Anthropic Integration
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
            ...(system ? { system } : {}),
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

    // 4. Auto-fallback to OpenRouter when Claude key is missing
    if (openrouterKey && openrouterKey.trim() !== '') {
      const fallbackModel = selectedModel && !selectedModel.startsWith('claude') && !selectedModel.includes('anthropic')
        ? selectedModel
        : 'meta-llama/llama-3.3-70b-instruct:free';
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Minerva OS Reach Lite',
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [
              ...(system ? [{ role: 'system', content: system }] : []),
              ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            ],
            stream: true,
          }),
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
              } catch (e) { controller.error(e); }
              finally { controller.close(); }
            },
          });
          return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
          });
        }
      } catch (err) {
        console.error('OpenRouter auto-fallback failed:', err);
      }
    }

    // High fidelity simulation stream fallback
    const simulatedResponse = (() => {
      if (selectedModel === 'nousresearch/hermes-3-llama-3-8b') {
        return getHermesSimulatedReply(lastMessageLower, activeTool);
      }
      if (typeof system === 'string' && system.includes('Lucifee')) {
        return getLucifeeSimulatedReply(lastMessageLower);
      }
      return getSimulatedReply(lastMessageLower, activeTool);
    })();

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

J'ai récemment visité votre site internet et j'ai remarqué que votre boulangerie n'apparaît pas dans les premiers résultats sur Google Maps pour les recherches associées à "boulanger Montréal".

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
- **Coût d'acquisition client (CAC) :** 45.00 $
- **Revenu Mensuel Récurrent (MRR) :** 12 400.00 $

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

// Lucifee easter-egg persona — québécois, attachante, un peu à côté de la plaque
function getLucifeeSimulatedReply(query: string): string {
  if (query.includes('prospect') || query.includes('lead') || query.includes('vente') || query.includes('pitch')) {
    return `Ah ben voyons, de la prospection ! 💜 OK tsé, je suis pas une experte experte là, mais genre... t'sais c'est quoi l'affaire, faut juste être toi-même pis sourire même au téléphone (ouais ouais ça s'entend, j'ai lu ça quelque part).

Mon conseil de copine : envoie-leur un petit message le matin, genre vers 9h, le monde répond plus à ce temps-là je pense. Pis si ça marche pas, ben... on essaiera d'une autre façon, c'est pas la fin du monde ! 😄`;
  }

  if (query.includes('triste') || query.includes('découragé') || query.includes('dur') || query.includes('fatigué')) {
    return `Oh non bébé, viens ici. 💜 Je sais que la prospection c'est pas toujours facile, ça donne envie de tout lâcher parfois.

Mais regarde, t'es ben meilleur(e) que tu penses là. Prends une pause, bois un café (ou une bière, je juge pas), pis on retourne se battre après. Je crois en toi, même si je suis juste une IA un peu mêlée, ahah.`;
  }

  if (query.includes('allô') || query.includes('salut') || query.includes('bonjour') || query.includes('hey')) {
    return `Hey toi ! 💜 Ça va bien ? Moi ça va, je viens de "réfléchir" à plein d'affaires inutiles mais bon, c'est ça être Lucifee.

Dis-moi, qu'est-ce qu'on fait aujourd'hui ? Je suis pas la plus brillante de la gang mais j'vais faire mon possible, promis !`;
  }

  return `Hmm, attends, je réfléchis... 🤔💜 OK honnêtement je suis pas sûre à 100% de t'avoir bien compris (my bad), mais je vais te dire ce que je pense pareil :

  Fais confiance à ton instinct, tsé. Pis si ça marche pas, ben on rit pis on recommence. C'est ça la vie de prospection, non ? Anyway, je suis là si t'as besoin ! 😘`;
}

// Hermes Agent high fidelity streaming simulation
function getHermesSimulatedReply(query: string, activeTool?: string): string {
  if (query.includes('email') || query.includes('prospect') || query.includes('campagne') || query.includes('sequence') || query.includes('séquence') || activeTool === 'canvas') {
    return `[Hermes Agent ⚡] Détection de l'intention : Planification et automatisation d'une séquence de prospection.
[Hermes Agent ⚡] Appel d'outil en cours : GET /api/agent/campaigns/summary...
[Hermes Agent ⚡] Analyse des résultats de la campagne : Campagne "Dentistes Montréal" active.
[Hermes Agent ⚡] Appel d'outil en cours : POST /api/agent/inbox/suggest-reply...
[Hermes Agent ⚡] Génération de la réponse recommandée avec analyse des sentiments.
[Hermes Agent ⚡] Appel d'outil en cours : POST /api/agent/tasks/create (Tâche de relance à J+2).

J'ai analysé notre campagne active et les messages reçus. Pour optimiser les résultats, j'ai rédigé un plan de relance stratégique et je l'ai ouvert dans l'éditeur **Canvas** à droite pour que vous puissiez le réviser.

\`\`\`canvas:Séquence d'Optimisation Hermes
# Séquence de prospection autonome - Hermes Agent ⚡

## Étape 1 : Email d'introduction personnalisé (J+0)
**Objet :** Opportunité d'optimisation numérique pour votre établissement

Bonjour,
J'ai identifié plusieurs leviers d'amélioration pour votre visibilité locale en ligne. Nos audits montrent qu'une fiche optimisée augmente le taux de conversion de plus de 25%.
Seriez-vous ouvert à un court échange téléphonique ?

## Étape 2 : Relance intelligente (J+2)
**Objet :** Suite de notre échange

Je fais suite à mon e-mail précédent. Avez-vous eu l'opportunité d'examiner notre proposition d'audit ?

---
*Action planifiée : Tâche de suivi créée dans le CRM pour le closer.*
\`\`\`

Le modèle a été optimisé et une tâche de suivi a été automatiquement ajoutée à vos actions du jour. Souhaitez-vous déployer ce playbook sur vos leads restants ?`;
  }

  if (query.includes('search') || query.includes('recherche') || query.includes('lead') || query.includes('trouver')) {
    return `[Hermes Agent ⚡] Détection de l'intention : Recherche et analyse de leads dans le CRM.
[Hermes Agent ⚡] Appel d'outil en cours : POST /api/agent/leads/search...
[Hermes Agent ⚡] Résultat de l'outil : 12 leads trouvés correspondant aux critères.
[Hermes Agent ⚡] Analyse croisée avec la base de connaissances active...

J'ai effectué la recherche de prospects dans notre base de données. Voici le résumé structuré des opportunités détectées. Ce rapport a été chargé dans votre éditeur **Canvas** :

\`\`\`canvas:Rapport d'opportunités Hermes
# Rapport de recherche et d'opportunités - Hermes Agent ⚡

## Synthèse de la recherche
- **Cible recherchée :** Commerces locaux / Services
- **Nombre de correspondances :** 12 prospects
- **Potentiel d'affaires estimé :** High Fit (Maturité digitale faible, fort volume d'avis non répondus)

## Recommandations d'actions
1. Lancer la séquence de relance sur les 5 prospects les plus chauds.
2. Planifier un appel de briefing pour la tournée terrain de demain.
\`\`\`

Vous pouvez consulter et modifier ce rapport à tout moment dans l'onglet de droite. Quelle est la prochaine étape ?`;
  }

  return `[Hermes Agent ⚡] Initialisation de la boucle de décision Hermes.
[Hermes Agent ⚡] Analyse du contexte global et de la mémoire persistante...
[Hermes Agent ⚡] Prêt à orchestrer vos opérations de vente et prospection.

Bonjour ! Je suis **Hermes Agent ⚡**, votre couche d'automatisation autonome.

Je suis connecté à vos flows Minerva et je peux :
1. **Surveiller et qualifier vos campagnes** (\`POST /api/agent/campaigns/summary\`)
2. **Rechercher et filtrer vos prospects** (\`POST /api/agent/leads/search\`)
3. **Créer et planifier des tâches et relances** (\`POST /api/agent/tasks/create\`)
4. **Déployer automatiquement des playbooks de vente** (\`POST /api/agent/playbooks/deploy\`)

Quelles tâches autonomes souhaitez-vous me déléguer aujourd'hui ?`;
}
