import { LlmProvider } from './llm.interface';
import { LlmScriptResponse } from '@poc/shared';
import { SYSTEM_PROMPT, REGENERATE_PROMPT } from './prompts';

export class GroqProvider implements LlmProvider {
  async generateScript(instruction: string): Promise<LlmScriptResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined in the environment.');
    }

    return this.callGroq(instruction, apiKey, false);
  }

  private async callGroq(
    instruction: string,
    apiKey: string,
    isRetry: boolean,
  ): Promise<LlmScriptResponse> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const promptText = isRetry
      ? `${SYSTEM_PROMPT}\n\nUser Instruction: ${instruction}\n\nWARNING: Your previous response was not valid JSON matching the required shape — return ONLY the JSON object, nothing else.`
      : `${SYSTEM_PROMPT}\n\nUser Instruction: ${instruction}`;

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API returned error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned an empty completion content.');
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.detectedActions) || typeof parsed.script !== 'string') {
        throw new Error('Missing or invalid detectedActions/script fields.');
      }
      return parsed as LlmScriptResponse;
    } catch (err: any) {
      if (!isRetry) {
        console.warn(`Groq response invalid, retrying... Error: ${err.message}. Raw: ${content}`);
        return this.callGroq(instruction, apiKey, true);
      }
      throw new Error(`Groq validation failed after retry: ${err.message}. Raw: ${content}`);
    }
  }

  async regenerateStep(
    description: string,
    failedCode: string,
    errorMessage: string,
    pageHtml: string,
  ): Promise<{ code: string }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined in the environment.');
    }

    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const userContent = `Original Step Intent: ${description}
Failed Code:
${failedCode}

Runtime Error:
${errorMessage}

Page HTML (Truncated):
${pageHtml}`;

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `${REGENERATE_PROMPT}\n\n${userContent}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API returned error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned empty self-healing response.');
    }

    try {
      const parsed = JSON.parse(content);
      if (typeof parsed.code !== 'string') {
        throw new Error('Missing code field in Groq output.');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`Failed to parse self-healing response from Groq: ${e.message}. Raw: ${content}`);
    }
  }
}
