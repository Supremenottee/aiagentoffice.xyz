import { config } from './config.js';

export async function callLLM(systemPrompt, messages, options = {}) {
  const { apiKey, baseUrl, model } = config.openrouter;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const body = {
    model: options.model || model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://agentoffice.app',
      'X-Title': 'AgentOffice',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
