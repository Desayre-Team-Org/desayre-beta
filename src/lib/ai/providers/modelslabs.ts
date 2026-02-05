import { BaseProvider, GenerationResult } from './base';
import { ModelConfig, EnhancedPrompt } from '@/types';

export class ModelsLabsProvider extends BaseProvider {
  readonly name = 'ModelsLabs';
  readonly provider = 'modelslabs';

  async generate(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    try {
      const payload = {
        prompt: prompt.enhanced,
        negative_prompt: options?.negativePrompt || '',
        width: config.parameters.width || 1024,
        height: config.parameters.height || 1024,
        num_inference_steps: config.parameters.num_inference_steps || 30,
        guidance_scale: config.parameters.guidance_scale || 7.5,
        scheduler: config.parameters.scheduler || 'DPMSolverMultistep',
        model_id: config.model,
        ...options,
      };

      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify(payload),
        },
        120000
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ModelsLabs API error: ${error}`);
      }

      const data = await response.json();

      // Handle different response formats
      let imageUrl: string | undefined;
      
      if (data.image_url) {
        imageUrl = data.image_url;
      } else if (data.output && data.output[0]) {
        imageUrl = data.output[0];
      } else if (data.images && data.images[0]) {
        imageUrl = data.images[0];
      }

      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      return {
        success: true,
        url: imageUrl,
        metadata: {
          inferenceTime: data.inference_time,
          seed: data.seed,
          modelUsed: config.model,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async edit(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string,
    instructions?: string
  ): Promise<GenerationResult> {
    try {
      const payload = {
        image_url: imageUrl,
        prompt: prompt.enhanced,
        edit_instructions: instructions || prompt.original,
        negative_prompt: '',
        strength: config.parameters.strength || 0.75,
        num_inference_steps: config.parameters.num_inference_steps || 35,
        guidance_scale: config.parameters.guidance_scale || 8.0,
        model_id: config.model,
      };

      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify(payload),
        },
        120000
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ModelsLabs API error: ${error}`);
      }

      const data = await response.json();

      let outputUrl: string | undefined;
      
      if (data.image_url) {
        outputUrl = data.image_url;
      } else if (data.output && data.output[0]) {
        outputUrl = data.output[0];
      } else if (data.images && data.images[0]) {
        outputUrl = data.images[0];
      }

      if (!outputUrl) {
        throw new Error('No image URL in response');
      }

      return {
        success: true,
        url: outputUrl,
        metadata: {
          inferenceTime: data.inference_time,
          seed: data.seed,
          modelUsed: config.model,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async generateVideo(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string
  ): Promise<GenerationResult> {
    throw new Error('Video generation not supported by ModelsLabs provider');
  }
}

export const modelslabsProvider = new ModelsLabsProvider();
