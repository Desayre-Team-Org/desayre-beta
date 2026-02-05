import { BaseProvider, GenerationResult } from './base';
import { ModelConfig, EnhancedPrompt } from '@/types';

export class ModelsLabsProvider extends BaseProvider {
  readonly name = 'ModelsLabs';
  readonly provider = 'modelslabs';

  // Extract API key from Authorization header
  private getApiKey(headers: Record<string, string>): string {
    const auth = headers['Authorization'] || '';
    return auth.replace('Bearer ', '');
  }

  async generate(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    try {
      const apiKey = this.getApiKey(config.headers);
      
      console.log('ModelsLabs generate called:', {
        endpoint: config.endpoint,
        model: config.model,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
      });
      
      const payload = {
        key: apiKey,
        prompt: prompt.enhanced,
        negative_prompt: options?.negativePrompt || '',
        width: config.parameters.width || 1024,
        height: config.parameters.height || 1024,
        num_inference_steps: config.parameters.num_inference_steps || 30,
        guidance_scale: config.parameters.guidance_scale || 7.5,
        scheduler: config.parameters.scheduler || 'DPMSolverMultistep',
        model_id: config.model,
        samples: '1',
        safety_checker: 'no',
        enhance_prompt: 'yes',
        tomesd: 'yes',
        use_karras_sigmas: 'yes',
        ...options,
      };

      console.log('Sending request to ModelsLabs:', config.endpoint);
      
      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        120000
      );
      
      console.log('ModelsLabs response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ModelsLabs API error:', response.status, errorText);
        throw new Error(`ModelsLabs API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      console.log('ModelsLabs response data:', JSON.stringify(data).slice(0, 500));

      // Check for API error response
      if (data.status === 'error') {
        throw new Error(`ModelsLabs API error: ${data.message || 'Unknown error'}`);
      }

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
        console.error('No image URL in response. Full response:', JSON.stringify(data));
        throw new Error(`No image URL in response. Status: ${data.status}`);
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
      const apiKey = this.getApiKey(config.headers);
      
      const payload = {
        key: apiKey,
        init_image: imageUrl,
        prompt: prompt.enhanced,
        negative_prompt: '',
        strength: config.parameters.strength || 0.75,
        num_inference_steps: config.parameters.num_inference_steps || 35,
        guidance_scale: config.parameters.guidance_scale || 8.0,
        model_id: config.model,
        samples: '1',
        safety_checker: 'no',
      };

      const response = await this.fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
