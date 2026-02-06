import { BaseProvider } from './base';
import { modelslabsProvider } from './modelslabs';
import { xaiProvider } from './xai';
import { higgsfieldProvider } from './higgsfield';
import { ModelProvider, ModelConfig, EnhancedPrompt, GenerationType } from '@/types';

export * from './base';
export { modelslabsProvider } from './modelslabs';
export { xaiProvider } from './xai';
export { higgsfieldProvider } from './higgsfield';

const providers: Record<ModelProvider, BaseProvider> = {
  modelslabs: modelslabsProvider,
  xai: xaiProvider,
  higgsfield: higgsfieldProvider,
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

export async function editImage(
  config: ModelConfig,
  prompt: EnhancedPrompt,
  imageUrl: string,
  instructions?: string
) {
  const provider = getProvider(config.provider);
  return provider.edit(config, prompt, imageUrl, instructions);
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
