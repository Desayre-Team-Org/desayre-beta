import { BaseProvider } from './base';
import { modelslabsProvider } from './modelslabs';
import { xaiProvider } from './xai';
import { ModelProvider, ModelConfig, EnhancedPrompt, GenerationType } from '@/types';
import { aiRouter } from '@/lib/ai/router';

export * from './base';
export { modelslabsProvider } from './modelslabs';
export { xaiProvider } from './xai';

const providers: Record<ModelProvider, BaseProvider> = {
  modelslabs: modelslabsProvider,
  xai: xaiProvider,
};

export function getProvider(provider: ModelProvider): BaseProvider {
  const p = providers[provider];
  if (!p) {
    throw new Error(`Provider not found: ${provider}`);
  }
  return p;
}

export async function generateImage(
  config: ModelConfig,
  prompt: EnhancedPrompt,
  options?: Record<string, unknown>
) {
  const provider = getProvider(config.provider);
  return provider.generate(config, prompt, options);
}

/**
 * Edit an image with fallback support.
 * If xAI returns a 403 (permissions error), automatically falls back to ModelsLabs.
 */
export async function editImage(
  config: ModelConfig,
  prompt: EnhancedPrompt,
  imageUrl: string,
  instructions?: string
) {
  const provider = getProvider(config.provider);
  const result = await provider.edit(config, prompt, imageUrl, instructions);

  // If xAI failed with 403 (permissions), fallback to ModelsLabs
  if (
    !result.success &&
    config.provider === 'xai' &&
    result.error?.includes('403')
  ) {
    console.warn('[EDIT FALLBACK] xAI returned 403 (permissions). Falling back to ModelsLabs...');

    const fallbackConfig = aiRouter.route({
      type: 'edit',
      modelId: 'nano-banana-pro',
    });

    // Preserve original parameters (strength, etc.)
    fallbackConfig.parameters = {
      ...fallbackConfig.parameters,
      ...config.parameters,
    };

    const fallbackProvider = getProvider(fallbackConfig.provider);
    return fallbackProvider.edit(fallbackConfig, prompt, imageUrl, instructions);
  }

  return result;
}

export async function generateVideo(
  config: ModelConfig,
  prompt: EnhancedPrompt,
  imageUrl?: string,
  options?: Record<string, unknown>
) {
  const provider = getProvider(config.provider);
  return provider.generateVideo(config, prompt, imageUrl, options);
}
