import { BaseProvider, GenerationResult } from './base';
import { ModelConfig, EnhancedPrompt } from '@/types';

/**
 * xAI Grok Imagine Video Provider
 * 
 * Based on official docs: https://docs.x.ai/developers/model-capabilities/video/generation
 * 
 * Capabilities:
 * - Text-to-Video: Generate video from text prompt
 * - Image-to-Video: Animate a still image with a prompt
 * - Video Editing: Edit existing video with a prompt (via video_url)
 * 
 * Configuration:
 * - Duration: 1-15 seconds (not supported for video editing)
 * - Aspect Ratio: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3
 * - Resolution: 720p, 480p (not supported for video editing)
 * 
 * Flow:
 * 1. POST https://api.x.ai/v1/videos/generations → { request_id }
 * 2. GET  https://api.x.ai/v1/videos/{request_id} → { status, video }
 *    Status: 'pending' | 'done' | 'expired'
 */
export class XAIProvider extends BaseProvider {
  readonly name = 'xAI';
  readonly provider = 'xai';

  private readonly BASE_URL = 'https://api.x.ai/v1';

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

      // Build payload following xAI docs exactly
      const payload: Record<string, unknown> = {
        model: 'grok-imagine-video',
        prompt: prompt.enhanced,
      };

      // Optional: image_url for image-to-video
      if (imageUrl) {
        payload.image_url = imageUrl;
        console.log('[XAI] Image-to-video mode');
      } else {
        console.log('[XAI] Text-to-video mode');
      }

      // Optional: video_url for video editing
      if (options?.video_url) {
        payload.video_url = options.video_url;
        console.log('[XAI] Video editing mode');
        // Duration, aspect_ratio, resolution are NOT supported for video editing
      } else {
        // These params only apply to generation, NOT editing
        if (options?.duration) {
          const dur = Math.max(1, Math.min(15, Number(options.duration)));
          payload.duration = dur;
        }
        if (options?.aspect_ratio) {
          payload.aspect_ratio = options.aspect_ratio;
        }
        if (options?.resolution) {
          payload.resolution = options.resolution; // '720p' or '480p'
        }
      }

      console.log('[XAI] Payload:', JSON.stringify(payload, null, 2));

      // Step 1: Start generation
      const response = await this.fetchWithTimeout(
        `${this.BASE_URL}/videos/generations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        30000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[XAI] API error:', response.status, errorText);
        throw new Error(`xAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.request_id) {
        console.error('[XAI] No request_id in response:', data);
        throw new Error(`No request_id in response: ${JSON.stringify(data)}`);
      }

      console.log('[XAI] Got request_id:', data.request_id);

      // Step 2: Poll for result
      return this.pollForVideoResult(data.request_id, apiKey);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Poll for video generation result
   * 
   * Status values per xAI docs:
   * - 'pending': Still processing
   * - 'done': Video ready at video.url
   * - 'expired': Request expired, retry needed
   * 
   * Default: 120 attempts × 5s = 10 minutes max (15s videos can take a while)
   */
  private async pollForVideoResult(
    requestId: string,
    apiKey: string,
    maxAttempts: number = 120,
    delayMs: number = 5000
  ): Promise<GenerationResult> {
    const pollUrl = `${this.BASE_URL}/videos/${encodeURIComponent(requestId)}`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Wait before polling (first attempt too, since video generation takes time)
      await new Promise(resolve => setTimeout(resolve, delayMs));

      console.log(`[XAI POLL] Attempt ${attempt}/${maxAttempts}`);

      try {
        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[XAI POLL] Response ${response.status}: ${errorText}`);
          // Don't break on transient errors, keep polling
          continue;
        }

        const data = await response.json();
        const status: string = data.status;
        const videoUrl: string | undefined = data.video?.url;

        console.log(`[XAI POLL] Status: ${status}, URL: ${videoUrl ? 'present' : 'none'}`);

        if (status === 'done' && videoUrl) {
          console.log(`[XAI POLL] ✅ Video ready!`);
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
        }

        if (status === 'done' && !videoUrl) {
          // Done but no URL — likely moderation block
          console.error('[XAI POLL] Done but no video URL:', JSON.stringify(data));
          return {
            success: false,
            error: data.video?.respect_moderation === false
              ? 'Video was blocked by content moderation.'
              : 'Video generation completed but no URL was returned.',
          };
        }

        if (status === 'expired') {
          console.error('[XAI POLL] Request expired');
          return {
            success: false,
            error: 'Video generation request expired. Please try again.',
          };
        }

        // Status is 'pending' — continue polling
      } catch (error) {
        console.error('[XAI POLL] Error:', error);
        // Continue polling on network errors
      }
    }

    // Timeout
    console.error(`[XAI POLL] Timeout after ${maxAttempts} attempts (${(maxAttempts * delayMs / 1000 / 60).toFixed(1)} min)`);
    return {
      success: false,
      error: 'Timeout waiting for video generation. The video may still be processing — check your history later.',
    };
  }

  // Extract API key from Authorization header
  private getApiKey(headers: Record<string, string>): string {
    const auth = headers['Authorization'] || '';
    return auth.replace('Bearer ', '');
  }
}

export const xaiProvider = new XAIProvider();
