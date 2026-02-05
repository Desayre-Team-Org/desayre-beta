import { ModelConfig, EnhancedPrompt, GenerationType } from '@/types';

export interface GenerationResult {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly provider: string;

  abstract generate(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    options?: Record<string, unknown>
  ): Promise<GenerationResult>;

  abstract edit(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string,
    instructions?: string
  ): Promise<GenerationResult>;

  abstract generateVideo(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string
  ): Promise<GenerationResult>;

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 60000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  protected handleError(error: unknown): GenerationResult {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The generation took too long.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}
