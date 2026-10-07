import { LlmScriptResponse } from '@poc/shared';

export interface LlmProvider {
  generateScript(instruction: string): Promise<LlmScriptResponse>;
  regenerateStep(
    description: string,
    failedCode: string,
    errorMessage: string,
    pageHtml: string,
  ): Promise<{ code: string }>;
}
