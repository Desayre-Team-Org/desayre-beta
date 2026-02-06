import { BaseProvider, GenerationResult } from './base';
import { ModelConfig, EnhancedPrompt } from '@/types';

type HiggsfieldStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'nsfw'
  | 'canceled';

const DEFAULT_BASE_URL = 'https://platform.higgsfield.ai';

function buildAuthKey(): string {
  const directKey = process.env.HIGGSFIELD_API_KEY || process.env.HF_KEY;
  if (directKey) return directKey;

  const keyId = process.env.HIGGSFIELD_API_KEY_ID || process.env.HF_API_KEY;
  const keySecret = process.env.HIGGSFIELD_API_KEY_SECRET || process.env.HF_API_SECRET;
  if (keyId && keySecret) return `${keyId}:${keySecret}`;

  throw new Error(
    'Higgsfield API credentials not configured. Set HIGGSFIELD_API_KEY or HIGGSFIELD_API_KEY_ID/HIGGSFIELD_API_KEY_SECRET.'
  );
}

function resolveApplication(config: ModelConfig): string {
  const fromParams = config.parameters?.application as string | undefined;
  const fromEnv = process.env.HIGGSFIELD_VIDEO_APP;
  const app = fromParams || fromEnv;
  if (!app) {
    throw new Error(
      'Higgsfield application not configured. Set HIGGSFIELD_VIDEO_APP to your Soul video app path.'
    );
  }
  return app;
}

function buildApplicationUrl(baseUrl: string, application: string): string {
  if (application.startsWith('http://') || application.startsWith('https://')) {
    return application;
  }
  return `${baseUrl.replace(/\/$/, '')}/${application.replace(/^\/+/, '')}`;
}

function extractVideoUrl(data: Record<string, unknown>): string | undefined {
  const anyData = data as any;
  return (
    anyData?.video?.url ||
    anyData?.videos?.[0]?.url ||
    anyData?.result?.video?.url ||
    anyData?.result?.videos?.[0]?.url ||
    anyData?.output?.video?.url ||
    anyData?.output?.videos?.[0]?.url ||
    anyData?.outputs?.[0]?.url ||
    anyData?.artifacts?.[0]?.url
  );
}

export class HiggsfieldProvider extends BaseProvider {
  readonly name = 'Higgsfield';
  readonly provider = 'higgsfield';

  async generate(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    throw new Error('Image generation not supported by Higgsfield provider in this project.');
  }

  async edit(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl: string,
    instructions?: string
  ): Promise<GenerationResult> {
    throw new Error('Image editing not supported by Higgsfield provider in this project.');
  }

  async generateVideo(
    config: ModelConfig,
    prompt: EnhancedPrompt,
    imageUrl?: string,
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    try {
      const apiKey = buildAuthKey();
      const baseUrl = config.endpoint || DEFAULT_BASE_URL;
      const application = resolveApplication(config);
      const url = buildApplicationUrl(baseUrl, application);

      const referenceImageParam =
        (config.parameters?.referenceImageParam as string | undefined) ||
        process.env.HIGGSFIELD_REFERENCE_IMAGE_PARAM ||
        'reference_image_urls';

      const referenceImageUrls = (options?.referenceImageUrls as string[] | undefined) || [];

      const payload: Record<string, unknown> = {
        prompt: referenceImageUrls.length > 0 ? prompt.original : prompt.enhanced,
      };

      const extraOptions = { ...options };
      delete (extraOptions as any).referenceImageUrls;
      delete (extraOptions as any).imageUrl;

      Object.assign(payload, extraOptions);

      if (referenceImageUrls.length > 0) {
        payload[referenceImageParam] = referenceImageUrls;
      } else if (imageUrl) {
        payload.image_url = imageUrl;
      }

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        60000
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Higgsfield API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const requestId =
        (data.request_id as string | undefined) ||
        (data.requestId as string | undefined) ||
        (data.id as string | undefined);

      const statusUrl =
        (data.status_url as string | undefined) ||
        (data.statusUrl as string | undefined) ||
        (requestId ? `${baseUrl.replace(/\/$/, '')}/requests/${requestId}/status` : undefined);

      if (!statusUrl) {
        const directUrl = extractVideoUrl(data);
        if (directUrl) {
          return { success: true, url: directUrl, metadata: data };
        }
        throw new Error('No status URL returned by Higgsfield API.');
      }

      return this.pollForResult(statusUrl, apiKey, requestId);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async pollForResult(
    statusUrl: string,
    apiKey: string,
    requestId?: string,
    maxAttempts: number = 120,
    delayMs: number = 1000
  ): Promise<GenerationResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const status = (data.status as HiggsfieldStatus | undefined) || 'in_progress';

      if (status === 'completed') {
        const url = extractVideoUrl(data);
        if (url) {
          return {
            success: true,
            url,
            metadata: { requestId, ...data },
          };
        }
        return {
          success: false,
          error: 'Higgsfield completed but no video URL was found in the response.',
          metadata: { requestId, ...data },
        };
      }

      if (status === 'failed' || status === 'nsfw' || status === 'canceled') {
        return {
          success: false,
          error: `Higgsfield request ${status}.`,
          metadata: { requestId, ...data },
        };
      }
    }

    return {
      success: false,
      error: 'Timeout waiting for Higgsfield video generation.',
      metadata: { requestId },
    };
  }
}

export const higgsfieldProvider = new HiggsfieldProvider();
