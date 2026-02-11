import { GenerationType, ModelConfig, ModelProvider, EnhancedPrompt } from '@/types';

interface RouteConfig {
  type: GenerationType;
  resolution?: string;
  priority?: 'speed' | 'quality' | 'cost';
  modelId?: string;
}

interface ModelDefinition {
  id: string;
  name: string;
  provider: ModelProvider;
  type: GenerationType[];
  resolutions: string[];
  maxPromptLength: number;
  costPerGeneration: number;
  averageTimeSeconds: number;
  supportsNegativePrompt: boolean;
  parameters: Record<string, unknown>;
}

const MODEL_REGISTRY: Record<string, ModelDefinition> = {
  'nano-banana-pro': {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'modelslabs',
    type: ['image', 'edit'],
    resolutions: ['1:1', '9:16', '2:3', '3:4', '4:5', '5:4', '4:3', '3:2', '16:9', '21:9'],
    maxPromptLength: 500,
    costPerGeneration: 0.002,
    averageTimeSeconds: 8,
    supportsNegativePrompt: true,
    parameters: {
      num_inference_steps: 30,
      guidance_scale: 7.5,
      scheduler: 'UniPCMultistepScheduler',
      strength: 0.35,
    },
  },
  'grok-imagine-video': {
    id: 'grok-imagine-video',
    name: 'Grok Imagine Video',
    provider: 'xai',
    type: ['video'],
    resolutions: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
    maxPromptLength: 500,
    costPerGeneration: 0.01,
    averageTimeSeconds: 60,
    supportsNegativePrompt: false,
    parameters: {
      duration: 5,
      resolution: '720p',
    },
  },
};

const PROVIDER_ENDPOINTS: Record<ModelProvider, string> = {
  modelslabs: 'https://modelslab.com/api/v7',
  xai: 'https://api.x.ai/v1',
};

export class AIRouter {
  private apiKeys: Record<ModelProvider, string>;

  constructor() {
    this.apiKeys = {
      modelslabs: process.env.MODELS_LABS_API_KEY || '',
      xai: process.env.XAI_API_KEY || '',
    };

    console.log('AIRouter initialized:', {
      hasModelsLabsKey: !!this.apiKeys.modelslabs,
      modelsLabsKeyLength: this.apiKeys.modelslabs?.length,
      hasXaiKey: !!this.apiKeys.xai,
    });
  }

  route(config: RouteConfig): ModelConfig {
    const model = this.selectModel(config);
    const endpoint = this.buildEndpoint(model, config.type);
    const headers = this.buildHeaders(model.provider);
    const parameters = this.buildParameters(model, config);

    return {
      provider: model.provider,
      model: model.id,
      endpoint,
      headers,
      parameters,
    };
  }

  private selectModel(config: RouteConfig): ModelDefinition {
    if (config.modelId) {
      const model = MODEL_REGISTRY[config.modelId];
      if (!model) {
        throw new Error(`Model not found: ${config.modelId}`);
      }
      return model;
    }

    const candidates = Object.values(MODEL_REGISTRY).filter(
      (m) => m.type.includes(config.type)
    );

    if (candidates.length === 0) {
      throw new Error(`No model available for type: ${config.type}`);
    }

    // Filter by resolution if specified
    let matches = config.resolution
      ? candidates.filter((m) => m.resolutions.includes(config.resolution!))
      : candidates;

    if (matches.length === 0) {
      // Fall back to closest resolution
      matches = candidates;
    }

    // Sort by priority
    switch (config.priority) {
      case 'speed':
        matches.sort((a, b) => a.averageTimeSeconds - b.averageTimeSeconds);
        break;
      case 'cost':
        matches.sort((a, b) => a.costPerGeneration - b.costPerGeneration);
        break;
      case 'quality':
      default:
        // Prefer higher step counts and better providers
        matches.sort((a, b) => {
          const aSteps = (a.parameters.num_inference_steps as number) || 0;
          const bSteps = (b.parameters.num_inference_steps as number) || 0;
          return bSteps - aSteps;
        });
        break;
    }

    return matches[0];
  }

  private buildEndpoint(model: ModelDefinition, type: GenerationType): string {
    const baseUrl = PROVIDER_ENDPOINTS[model.provider];

    // ModelsLabs uses different endpoints than OpenAI format
    if (model.provider === 'modelslabs') {
      switch (type) {
        case 'image':
          return `${baseUrl}/images/text-to-image`;
        case 'edit':
          // Realtime img2img uses v6 endpoint (different from v7 text2img)
          return 'https://modelslab.com/api/v6/realtime/img2img';
        default:
          throw new Error(`ModelsLabs does not support type: ${type}`);
      }
    }

    // xAI endpoints
    if (model.provider === 'xai') {
      if (type === 'video') {
        const endpoint = `${baseUrl}/videos/generations`;
        console.log('Building xAI video endpoint:', endpoint);
        return endpoint;
      }
      return baseUrl;
    }



    // Default fallback
    switch (type) {
      case 'image':
        return `${baseUrl}/images/generations`;
      case 'edit':
        return `${baseUrl}/images/edits`;
      case 'video':
        return `${baseUrl}/videos/generations`;
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }
  }

  private buildHeaders(provider: ModelProvider): Record<string, string> {
    const apiKey = this.apiKeys[provider];

    if (!apiKey) {
      const envHint = provider === 'modelslabs' ? 'MODELS_LABS_API_KEY' : 'XAI_API_KEY';
      throw new Error(
        `API key not configured for provider: ${provider}. Please set ${envHint} environment variable.`
      );
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }



  private buildParameters(
    model: ModelDefinition,
    config: RouteConfig
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      ...model.parameters,
    };

    if (config.resolution) {
      const [width, height] = config.resolution.split('x').map(Number);
      params.width = width;
      params.height = height;
    }

    return params;
  }

  getModelInfo(modelId: string): ModelDefinition | undefined {
    return MODEL_REGISTRY[modelId];
  }

  listAvailableModels(type?: GenerationType): ModelDefinition[] {
    const models = Object.values(MODEL_REGISTRY);
    return type ? models.filter((m) => m.type.includes(type)) : models;
  }

  estimateCost(modelId: string): number {
    const model = MODEL_REGISTRY[modelId];
    return model?.costPerGeneration || 0;
  }

  estimateTime(modelId: string): number {
    const model = MODEL_REGISTRY[modelId];
    return model?.averageTimeSeconds || 30;
  }
}

export const aiRouter = new AIRouter();
