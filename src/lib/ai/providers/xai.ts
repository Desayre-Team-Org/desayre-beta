import { BaseProvider, GenerationResult } from './base';
import { ModelConfig, EnhancedPrompt } from '@/types';

export class XAIProvider extends BaseProvider {
  readonly name = 'xAI';
  readonly provider = 'xai';

  async generate(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    throw new Error('Image generation not supported by xAI provider. Use ModelsLabs for images.');
  }

  async edit(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string,
    instructions?: string
  ): Promise<GenerationResult> {
    throw new Error('Image editing not supported by xAI provider. Use ModelsLabs for image editing.');
  }

  async generateVideo(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl?: string,
    videoUrl?: string
  ): Promise<GenerationResult> {
    try {
      const apiKey = this.getApiKey(config.headers);

      // Start video generation
      const payload: Record<string, unknown> = {
        model: config.model,
        prompt: prompt.enhanced,
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      if (videoUrl) {
        payload.video_url = videoUrl;
      }

      console.log('Starting xAI video generation:', payload);

      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        30000 // 30s timeout for initial request
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('xAI API error:', response.status, errorText);
        throw new Error(`xAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('xAI video generation started:', data);

      if (!data.request_id) {
        throw new Error('No request_id in response');
      }

      // Poll for result
      return this.pollForVideoResult(data.request_id, apiKey);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async pollForVideoResult(
    requestId: string,
    apiKey: string,
    maxAttempts: number = 60,
    delayMs: number = 5000
  ): Promise<GenerationResult> {
    const pollUrl = 'https://api.x.ai/v1/video/result';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`Polling for video result, attempt ${attempt + 1}/${maxAttempts}`);

      await new Promise(resolve => setTimeout(resolve, delayMs));

      try {
        const response = await fetch(pollUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ request_id: requestId }),
        });

        if (!response.ok) {
          console.error('Poll response not OK:', response.status);
          continue;
        }

        const data = await response.json();
        console.log('Poll response:', JSON.stringify(data).slice(0, 200));

        if (data.status === 'completed' && data.url) {
          return {
            success: true,
            url: data.url,
            metadata: {
              requestId,
              duration: data.duration,
              fps: data.fps,
            },
          };
        } else if (data.status === 'failed') {
          return {
            success: false,
            error: `Video generation failed: ${data.error || 'Unknown error'}`,
          };
        }
        // If still processing, continue polling
      } catch (error) {
        console.error('Poll error:', error);
      }
    }

    return {
      success: false,
      error: 'Timeout waiting for video generation',
    };
  }

  // Extract API key from Authorization header
  private getApiKey(headers: Record<string, string>): string {
    const auth = headers['Authorization'] || '';
    return auth.replace('Bearer ', '');
  }
}

export const xaiProvider = new XAIProvider();
