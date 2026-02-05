import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, generations, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { generateVideo } from '@/lib/ai/providers';
import { generationQueue } from '@/lib/queue';
import { storage } from '@/lib/storage';
// sql imported from @/lib/db

const requestSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(400),
  resolution: z.enum(['576x320', '768x432', '1024x576']).optional(),
  duration: z.number().min(3).max(10).optional(),
  async: z.boolean().optional().default(true),
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

    const { imageUrl, prompt, resolution, duration, async: isAsync } = validation.data;

    // Encode prompt for video
    const encoder = createPromptEncoder('video', { style: 'cinematic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'video',
      resolution,
      priority: 'quality',
    });

    // Override duration if specified
    if (duration) {
      modelConfig.parameters.duration = duration;
    }

    // Create generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'video',
        status: isAsync ? 'pending' : 'processing',
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        resolution,
        inputImageUrl: imageUrl,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
      })
      .returning();

    if (isAsync) {
      // Add to queue with lower priority (higher score) as video takes longer
      await generationQueue.enqueue('video', {
        generationId: generation.id,
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelConfig,
        resolution,
        inputImageUrl: imageUrl,
        userId: session.userId,
      }, 5); // Higher priority value = lower actual priority

      return NextResponse.json({
        success: true,
        data: {
          generationId: generation.id,
          status: 'pending',
          message: 'Video generation queued',
          estimatedTime: aiRouter.estimateTime(modelConfig.model),
        },
      });
    }

    // Synchronous generation (not recommended for video due to long processing time)
    const result = await generateVideo(modelConfig, enhancedPrompt, imageUrl);

    if (!result.success || !result.url) {
      await db
        .update(generations)
        .set({
          status: 'failed',
          error: result.error || 'Video generation failed',
        })
        .where(sql => sql.eq(generations.id, generation.id));

      return NextResponse.json(
        { success: false, error: result.error || 'Video generation failed' },
        { status: 500 }
      );
    }

    // Upload to storage
    const upload = await storage.uploadFromUrl(result.url, 'videos');

    // Update generation record
    await db
      .update(generations)
      .set({
        status: 'completed',
        outputUrl: upload.publicUrl,
        metadata: result.metadata,
        completedAt: new Date(),
      })
      .where(sql => sql.eq(generations.id, generation.id));

    return NextResponse.json({
      success: true,
      data: {
        generationId: generation.id,
        status: 'completed',
        url: upload.publicUrl,
      },
    });
  } catch (error) {
    console.error('Video generation error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
