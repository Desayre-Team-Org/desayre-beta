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

  // Convert width/height to aspect ratio for nano-banana-pro
  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (ratio === 1) return '1:1';
    if (ratio > 1.7 && ratio < 1.8) return '16:9';
    if (ratio > 0.55 && ratio < 0.6) return '9:16';
    if (ratio > 1.3 && ratio < 1.4) return '4:3';
    if (ratio > 0.7 && ratio < 0.8) return '3:4';
    return '1:1'; // default
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
      
      const width = config.parameters.width || 1024;
      const height = config.parameters.height || 1024;
      const aspectRatio = this.getAspectRatio(width as number, height as number);
      
      // Build payload based on model type
      const isNanoBanana = config.model === 'nano-banana-pro';
      
      const payload: Record<string, unknown> = {
        key: apiKey,
        prompt: prompt.enhanced,
        model_id: config.model,
        samples: '1',
        safety_checker: 'no',
      };
      
      if (isNanoBanana) {
        // Nano Banana Pro uses aspect_ratio
        payload.aspect_ratio = aspectRatio;
      } else {
        // Other models use width/height
        payload.width = width;
        payload.height = height;
        payload.negative_prompt = options?.negativePrompt || '';
        payload.num_inference_steps = config.parameters.num_inference_steps || 30;
        payload.guidance_scale = config.parameters.guidance_scale || 7.5;
        payload.scheduler = config.parameters.scheduler || 'DPMSolverMultistep';
        payload.enhance_prompt = 'yes';
        payload.tomesd = 'yes';
        payload.use_karras_sigmas = 'yes';
      }
      
      // Merge any additional options
      Object.assign(payload, options);

      console.log('Sending request to ModelsLabs:', config.endpoint);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
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
        console.error('ModelsLabs API error response:', JSON.stringify(data, null, 2));
        throw new Error(`ModelsLabs API error: ${data.message || JSON.stringify(data)}`);
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
