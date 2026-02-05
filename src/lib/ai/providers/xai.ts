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
    throw new Error('Image generation not supported by xAI provider. Use Grok Imagine Video for video generation.');
  }

  async edit(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string,
    instructions?: string
  ): Promise<GenerationResult> {
    throw new Error('Image editing not supported by xAI provider');
  }

  async generateVideo(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string
  ): Promise<GenerationResult> {
    try {
      const payload = {
        image_url: imageUrl,
        prompt: prompt.enhanced,
        duration: config.parameters.duration || 5,
        fps: config.parameters.fps || 24,
        motion_bucket_id: config.parameters.motion_bucket_id || 127,
        model: config.model,
      };

      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify(payload),
        },
        300000 // 5 minute timeout for video
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error: ${error}`);
      }

      const data = await response.json();

      // Poll for result if async
      if (data.job_id) {
        return await this.pollVideoResult(config, data.job_id);
      }

      let videoUrl: string | undefined;
      
      if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.output && data.output.video_url) {
        videoUrl = data.output.video_url;
      }

      if (!videoUrl) {
        throw new Error('No video URL in response');
      }

      return {
        success: true,
        url: videoUrl,
        metadata: {
          duration: data.duration,
          fps: data.fps,
          modelUsed: config.model,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async pollVideoResult(
    config: ModelConfig,
    jobId: string,
    maxAttempts: number = 30
  ): Promise<GenerationResult> {
    const pollEndpoint = config.endpoint.replace('/generations', `/jobs/${jobId}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        const response = await fetch(pollEndpoint, {
          method: 'GET',
          headers: config.headers,
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data.status === 'completed' && data.video_url) {
          return {
            success: true,
            url: data.video_url,
            metadata: {
              duration: data.duration,
              fps: data.fps,
              modelUsed: config.model,
            },
          };
        }

        if (data.status === 'failed') {
          throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Video generation timed out');
  }
}

export const xaiProvider = new XAIProvider();
