import { Injectable, InternalServerErrorException, BadGatewayException, Logger } from '@nestjs/common';
import { LlmScriptResponse } from '@poc/shared';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { LlmProvider } from './llm.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly providers: Record<string, LlmProvider>;

  constructor() {
    this.providers = {
      gemini: new GeminiProvider(),
      groq: new GroqProvider(),
    };
  }

  async generateScript(instruction: string): Promise<LlmScriptResponse> {
    const primaryName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    const fallbackName = primaryName === 'gemini' ? 'groq' : 'gemini';

    const primaryProvider = this.providers[primaryName];
    const fallbackProvider = this.providers[fallbackName];

    if (!primaryProvider) {
      throw new InternalServerErrorException(`Unknown LLM provider: ${primaryName}`);
    }

    try {
      this.logger.log(`Attempting generation with primary provider: ${primaryName}`);
      return await primaryProvider.generateScript(instruction);
    } catch (err: any) {
      this.logger.warn(
        `Primary provider ${primaryName} failed: ${err.message}. Retrying with fallback: ${fallbackName}`,
      );

      if (!fallbackProvider) {
        throw new BadGatewayException(
          `Primary provider failed and no fallback available: ${err.message}`,
        );
      }

      try {
        return await fallbackProvider.generateScript(instruction);
      } catch (fallbackErr: any) {
        this.logger.error(
          `Fallback provider ${fallbackName} also failed: ${fallbackErr.message}`,
        );
        throw new BadGatewayException(
          `Both LLM providers failed. Primary error: ${err.message}. Fallback error: ${fallbackErr.message}`,
        );
      }
    }
  }

  async regenerateStep(
    description: string,
    failedCode: string,
    errorMessage: string,
    pageHtml: string,
  ): Promise<{ code: string }> {
    const primaryName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    const fallbackName = primaryName === 'gemini' ? 'groq' : 'gemini';

    const primaryProvider = this.providers[primaryName];
    const fallbackProvider = this.providers[fallbackName];

    if (!primaryProvider) {
      throw new InternalServerErrorException(`Unknown LLM provider: ${primaryName}`);
    }

    try {
      this.logger.log(`Attempting step self-healing with primary provider: ${primaryName}`);
      return await primaryProvider.regenerateStep(description, failedCode, errorMessage, pageHtml);
    } catch (err: any) {
      this.logger.warn(
        `Primary provider ${primaryName} self-healing failed: ${err.message}. Retrying with fallback: ${fallbackName}`,
      );

      if (!fallbackProvider) {
        throw new BadGatewayException(
          `Primary provider self-healing failed and no fallback available: ${err.message}`,
        );
      }

      try {
        return await fallbackProvider.regenerateStep(description, failedCode, errorMessage, pageHtml);
      } catch (fallbackErr: any) {
        this.logger.error(
          `Fallback provider ${fallbackName} self-healing also failed: ${fallbackErr.message}`,
        );
        throw new BadGatewayException(
          `Both LLM providers failed self-healing. Primary error: ${err.message}. Fallback error: ${fallbackErr.message}`,
        );
      }
    }
  }
}
