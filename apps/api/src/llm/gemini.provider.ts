import { LlmProvider } from './llm.interface';
import { LlmScriptResponse } from '@poc/shared';
import { SYSTEM_PROMPT, REGENERATE_PROMPT } from './prompts';

export class GeminiProvider implements LlmProvider {
  async generateScript(instruction: string): Promise<LlmScriptResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment.');
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Instruction: ${instruction}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            detectedActions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'List of human-readable steps inferred from the instruction',
            },
            script: {
              type: 'STRING',
              description: 'The complete runnable Playwright script starting with imports',
            },
          },
          required: ['detectedActions', 'script'],
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API returned error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Gemini API returned an empty response.');
    }

    try {
      const parsed: LlmScriptResponse = JSON.parse(textResponse);
      if (!Array.isArray(parsed.detectedActions) || typeof parsed.script !== 'string') {
        throw new Error('Gemini API response structure mismatch.');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`Failed to parse Gemini API JSON response: ${e.message}. Content: ${textResponse}`);
    }
  }

  async regenerateStep(
    description: string,
    failedCode: string,
    errorMessage: string,
    pageHtml: string,
  ): Promise<{ code: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment.');
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const userContent = `Original Step Intent: ${description}
Failed Code:
${failedCode}

Runtime Error:
${errorMessage}

Page HTML (Truncated):
${pageHtml}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${REGENERATE_PROMPT}\n\n${userContent}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            code: {
              type: 'STRING',
              description: 'The corrected single Playwright statement or block',
            },
          },
          required: ['code'],
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API returned error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Gemini API returned an empty response.');
    }

    try {
      const parsed = JSON.parse(textResponse);
      if (typeof parsed.code !== 'string') {
        throw new Error('Missing code field in Gemini output.');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`Failed to parse self-healing response: ${e.message}. Content: ${textResponse}`);
    }
  }
}
