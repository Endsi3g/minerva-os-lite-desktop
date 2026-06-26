import Anthropic from '@anthropic-ai/sdk';

export interface AISettings {
  ai_provider?: string | null;
  ai_model?: string | null;
  openrouter_key?: string | null;
  groq_api_key?: string | null;
  together_api_key?: string | null;
}

export interface AICallOptions {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  settings?: AISettings;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

const getGlobalKeys = () => ({
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
  togetherKey: process.env.TOGETHER_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
});

export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const userOpenrouterKey = settings?.openrouter_key || '';
  const openrouterKey = userOpenrouterKey || keys.openrouterKey;
  const groqKey = settings?.groq_api_key || keys.groqKey;
  const togetherKey = settings?.together_api_key || keys.togetherKey;
  const anthropicKey = keys.anthropicKey;

  const explicitProvider = settings?.ai_provider;
  const provider = (() => {
    if (explicitProvider === 'openrouter' && openrouterKey) return 'openrouter';
    if (explicitProvider === 'anthropic' && anthropicKey) return 'anthropic';
    if (explicitProvider === 'groq' && groqKey) return 'groq';
    if (explicitProvider === 'together' && togetherKey) return 'together';
    // Cascades
    if (userOpenrouterKey) return 'openrouter';
    if (groqKey) return 'groq';
    if (togetherKey) return 'together';
    if (anthropicKey) return 'anthropic';
    if (openrouterKey) return 'openrouter';
    return 'anthropic';
  })();

  const OPENROUTER_DEFAULT = 'meta-llama/llama-3.3-70b-instruct:free';

  let model = settings?.ai_model || (
    provider === 'openrouter' ? OPENROUTER_DEFAULT :
    provider === 'groq' ? 'llama-3.3-70b-versatile' :
    provider === 'together' ? 'meta-llama/Llama-3-70b-chat-hf' :
    'claude-sonnet-4-6'
  );

  // Remap placeholder / retired / deprecated model IDs to a valid default
  if (
    model === 'openrouter/free' ||
    model === 'meta-llama/llama-3-8b-instruct:free' ||
    model === 'meta-llama/llama-3.1-8b-instruct:free' ||
    model === 'google/gemma-2-9b-it:free' ||
    model === 'qwen/qwen-2-7b-instruct:free'
  ) {
    model = OPENROUTER_DEFAULT;
  }

  // Anthropic model IDs (claude-*) are not valid on OpenRouter — remap to free default
  if (provider === 'openrouter' && model.startsWith('claude')) {
    model = OPENROUTER_DEFAULT;
  }

  const apiKey = (() => {
    if (provider === 'openrouter') return openrouterKey;
    if (provider === 'groq') return groqKey;
    if (provider === 'together') return togetherKey;
    return anthropicKey;
  })();

  return { provider, model, apiKey };
}

// Generate a non-streaming text response
export async function generateCompletion(options: AICallOptions): Promise<string> {
  const { provider, model, apiKey } = resolveAIProvider(options.settings);

  if (!apiKey) {
    throw new Error(`AI API Key is missing for provider: ${provider}`);
  }

  // Map messages to ensure proper roles
  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  if (provider === 'openrouter' || provider === 'groq' || provider === 'together') {
    const baseURL = 
      provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
      provider === 'groq' ? 'https://api.groq.com/openai/v1' :
      'https://api.together.xyz/v1';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      headers['X-Title'] = 'Minerva OS Reach Lite';
    }

    const body = {
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        ...messages,
      ],
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    };

    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`AI Provider ${provider} error: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  // Anthropic Provider
  if (provider === 'anthropic') {
    const anthropicModel = model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022';
    const client = new Anthropic({ apiKey });
    
    // Anthropic SDK doesn't allow 'system' in the messages array
    const userAndAssistantMessages = messages.filter(m => m.role !== 'system');
    
    const msg = await client.messages.create({
      model: anthropicModel,
      max_tokens: options.maxTokens || 1500,
      system: options.system,
      messages: userAndAssistantMessages as any,
      temperature: options.temperature ?? 0.7,
    });

    return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
}

// Generate a streaming text response returning a ReadableStream of SSE events
export async function generateStreamCompletion(options: AICallOptions): Promise<ReadableStream> {
  const { provider, model, apiKey } = resolveAIProvider(options.settings);

  if (!apiKey) {
    throw new Error(`AI API Key is missing for provider: ${provider}`);
  }

  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  const encoder = new TextEncoder();

  if (provider === 'openrouter' || provider === 'groq' || provider === 'together') {
    const baseURL = 
      provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
      provider === 'groq' ? 'https://api.groq.com/openai/v1' :
      'https://api.together.xyz/v1';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      headers['X-Title'] = 'Minerva OS Reach Lite';
    }

    const body = {
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        ...messages,
      ],
      stream: true,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    };

    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`AI Provider ${provider} streaming error: ${resp.status} - ${errorText}`);
    }

    // Pipe the response body stream directly
    return new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
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
  }

  if (provider === 'anthropic') {
    const anthropicModel = model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022';
    const userAndAssistantMessages = messages.filter(m => m.role !== 'system');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: anthropicModel,
        ...(options.system ? { system: options.system } : {}),
        messages: userAndAssistantMessages,
        stream: true,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature ?? 0.7,
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Anthropic API streaming error: ${resp.status} - ${errorText}`);
    }

    return new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
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
          reader.releaseLock();
        }
      }
    });
  }

  throw new Error(`Unsupported AI Provider for streaming: ${provider}`);
}
