import { EnhancedPrompt, GenerationType } from '@/types';

interface PromptEncoderConfig {
  type: GenerationType;
  style?: 'photorealistic' | 'cinematic' | 'artistic' | 'minimal';
  quality?: 'standard' | 'high' | 'ultra';
  aspectRatio?: string;
}

const CINEMATIC_TAGS = [
  'ultra realistic',
  'hyper detailed',
  '8k resolution',
  'professional photography',
  'cinematic lighting',
  'depth of field',
  'sharp focus',
  'masterpiece',
  'best quality',
  'highly detailed',
];

const PHOTOREALISTIC_TAGS = [
  'photorealistic',
  'realistic texture',
  'natural lighting',
  'lifelike',
  'true to life',
  'professional photo',
  'RAW photo',
  'DSLR quality',
];

const CINEMATIC_STYLE_MODIFIERS = {
  photorealistic: 'photorealistic style, lifelike appearance, natural textures, realistic lighting',
  cinematic: 'cinematic composition, film grain, anamorphic lens flare, color graded, movie still',
  artistic: 'artistic interpretation, stylized, creative composition, expressive',
  minimal: 'minimalist composition, clean lines, simple background, focused subject',
};

const QUALITY_ENHANCERS = {
  standard: 'high quality, detailed',
  high: 'ultra high quality, extremely detailed, crisp',
  ultra: 'masterpiece, best quality, ultra detailed, 8k, hyperdetailed, intricate details',
};

const NEGATIVE_PROMPTS = {
  image: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limbs, extra fingers, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, cross-eyed, mutated hands, polar lowres, bad face, out of frame, oversaturated, overexposed',
  edit: 'low quality, artifacts, inconsistent style, unnatural blend',
  video: 'shaky, blurry, low quality, distorted, unstable, jittery, bad motion, unnatural movement',
};

export class PromptEncoder {
  private config: PromptEncoderConfig;

  constructor(config: PromptEncoderConfig) {
    this.config = {
      style: 'photorealistic',
      quality: 'high',
      ...config,
    };
  }

  encode(rawPrompt: string): EnhancedPrompt {
    const cleanedPrompt = this.cleanPrompt(rawPrompt);
    const tags = this.generateTags();
    const styleModifier = this.getStyleModifier();
    const qualityModifier = this.getQualityModifier();
    const structuredPrompt = this.structurePrompt(cleanedPrompt, tags, styleModifier, qualityModifier);
    
    return {
      original: rawPrompt,
      enhanced: structuredPrompt,
      tags,
      style: this.config.style || 'photorealistic',
      quality: this.getQualityScore(),
    };
  }

  private cleanPrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>\[\]{}]/g, '')
      .slice(0, 500);
  }

  private generateTags(): string[] {
    const baseTags = [...CINEMATIC_TAGS];
    
    if (this.config.style === 'photorealistic') {
      baseTags.push(...PHOTOREALISTIC_TAGS);
    }
    
    // Remove duplicates and limit
    return [...new Set(baseTags)].slice(0, 8);
  }

  private getStyleModifier(): string {
    return CINEMATIC_STYLE_MODIFIERS[this.config.style || 'photorealistic'];
  }

  private getQualityModifier(): string {
    return QUALITY_ENHANCERS[this.config.quality || 'high'];
  }

  private getQualityScore(): number {
    const scores = { standard: 0.7, high: 0.85, ultra: 0.95 };
    return scores[this.config.quality || 'high'];
  }

  private structurePrompt(
    cleanedPrompt: string,
    tags: string[],
    styleModifier: string,
    qualityModifier: string
  ): string {
    const parts: string[] = [];
    
    // Quality prefix for emphasis
    parts.push(qualityModifier);
    
    // Main subject with style
    parts.push(`${cleanedPrompt}, ${styleModifier}`);
    
    // Enhancing tags
    parts.push(tags.join(', '));
    
    // Aspect ratio context if provided
    if (this.config.aspectRatio) {
      parts.push(`composition: ${this.config.aspectRatio}`);
    }
    
    return parts.join('. ');
  }

  getNegativePrompt(): string {
    return NEGATIVE_PROMPTS[this.config.type];
  }
}

export function createPromptEncoder(
  type: GenerationType,
  options?: Omit<PromptEncoderConfig, 'type'>
): PromptEncoder {
  return new PromptEncoder({ type, ...options });
}

export function enhancePrompt(
  rawPrompt: string,
  type: GenerationType,
  style: PromptEncoderConfig['style'] = 'photorealistic'
): EnhancedPrompt {
  const encoder = createPromptEncoder(type, { style });
  return encoder.encode(rawPrompt);
}
