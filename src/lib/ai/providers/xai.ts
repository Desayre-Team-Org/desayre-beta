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
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    try {
      const apiKey = this.getApiKey(config.headers);

      // Start video generation
      const payload: Record<string, unknown> = {
        model: config.model,
        prompt: prompt.enhanced,
        ...options,
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
        console.log(`[XAI] Image URL provided: ${imageUrl}`);
      } else {
        console.log('[XAI] No image URL provided - text-to-video mode');
      }

      console.log('[XAI] Final payload:', JSON.stringify(payload, null, 2));
      console.log(`[XAI] Duration requested: ${options?.duration || 'not set (default)'}`);
      console.log('xAI endpoint:', config.endpoint);

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
      console.log('xAI video generation response:', JSON.stringify(data, null, 2));

      if (!data.request_id) {
        console.error('No request_id in xAI response:', data);
        throw new Error(`No request_id in response: ${JSON.stringify(data)}`);
      }

      console.log('Got request_id:', data.request_id);

      // Poll for result
      return this.pollForVideoResult(data.request_id, apiKey);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async pollForVideoResult(
    requestId: string,
    apiKey: string,
    maxAttempts: number = 120,
    delayMs: number = 5000
  ): Promise<GenerationResult> {
    const pollUrl = `https://api.x.ai/v1/videos/${encodeURIComponent(requestId)}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`[POLL] Attempt ${attempt + 1}/${maxAttempts}, requestId: ${requestId}`);

      await new Promise(resolve => setTimeout(resolve, delayMs));

      try {
        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        console.log(`[POLL] Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[POLL] Response not OK: ${response.status}, body: ${errorText}`);
          continue;
        }

        const data = await response.json();
        console.log(`[POLL] Response data:`, JSON.stringify(data, null, 2));

        // xAI docs: status is 'pending', 'done', or 'expired'
        // When 'done', video.url contains the result
        const videoUrl = data.video?.url;
        const status = data.status;

        console.log(`[POLL] Status: ${status}, Video URL: ${videoUrl ? 'present' : 'missing'}`);

        if (status === 'done' && videoUrl) {
          console.log(`[POLL] Video completed! URL: ${videoUrl}`);
          return {
            success: true,
            url: videoUrl,
            metadata: {
              requestId,
              duration: data.video?.duration,
              model: data.model,
              respect_moderation: data.video?.respect_moderation,
            },
          };
        } else if (status === 'done' && !videoUrl) {
          console.error(`[POLL] Status is done but no video URL found:`, data);
          return {
            success: false,
            error: 'Video generation completed but no video URL was returned.',
          };
        } else if (status === 'failed') {
          console.error(`[POLL] Video generation failed:`, data.error);
          return {
            success: false,
            error: `Video generation failed: ${data.error || 'Unknown error'}`,
          };
        } else if (status === 'expired') {
          console.error(`[POLL] Video generation request expired`);
          return {
            success: false,
            error: 'Video generation request expired. Please try again.',
          };
        } else {
          console.log(`[POLL] Still processing (status: '${status}'), continuing polling...`);
        }
      } catch (error) {
        console.error('[POLL] Error during polling:', error);
      }
    }

    console.error(`[POLL] Timeout after ${maxAttempts} attempts`);
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
