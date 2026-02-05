import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, generations, sql } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { generateImage } from '@/lib/ai/providers';
import { generationQueue } from '@/lib/queue';
import { storage } from '@/lib/storage';


const requestSchema = z.object({
  prompt: z.string().min(1).max(500),
  resolution: z.enum(['512x512', '768x768', '1024x1024', '1024x576', '576x1024']).optional(),
  priority: z.enum(['speed', 'quality', 'cost']).optional(),
  async: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await requireAuth(request);

    // Parse and validate request
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { prompt, resolution, priority, async: isAsync } = validation.data;

    // Encode prompt
    const encoder = createPromptEncoder('image', { style: 'photorealistic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'image',
      resolution,
      priority,
    });

    // Create generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'image',
        status: isAsync ? 'pending' : 'processing',
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        resolution,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
      })
      .returning();

    if (isAsync) {
      // Add to queue
      await generationQueue.enqueue('image', {
        generationId: generation.id,
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelConfig,
        resolution,
        userId: session.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          generationId: generation.id,
          status: 'pending',
          message: 'Image generation queued',
        },
      });
    }

    // Synchronous generation
    console.log('Generating image with config:', {
      endpoint: modelConfig.endpoint,
      model: modelConfig.model,
      provider: modelConfig.provider,
      hasApiKey: !!modelConfig.headers?.Authorization,
    });
    
    const result = await generateImage(modelConfig, enhancedPrompt, {
      negativePrompt: encoder.getNegativePrompt(),
    });

    console.log('Generation result:', {
      success: result.success,
      hasUrl: !!result.url,
      error: result.error,
    });

    if (!result.success || !result.url) {
      await db
        .update(generations)
        .set({
          status: 'failed',
          error: result.error || 'Generation failed',
        })
        .where(eq(generations.id, generation.id));

      return NextResponse.json(
        { success: false, error: result.error || 'Generation failed' },
        { status: 500 }
      );
    }

    // Upload to storage
    console.log('Uploading image to storage from URL:', result.url);
    const upload = await storage.uploadFromUrl(result.url, 'images');
    console.log('Upload result:', { key: upload.key, publicUrl: upload.publicUrl });

    // Update generation record
    await db
      .update(generations)
      .set({
        status: 'completed',
        outputUrl: upload.publicUrl,
        metadata: result.metadata,
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));

    return NextResponse.json({
      success: true,
      data: {
        generationId: generation.id,
        status: 'completed',
        url: upload.publicUrl,
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
