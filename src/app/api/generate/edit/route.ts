import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, generations, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { editImage } from '@/lib/ai/providers';
import { generationQueue } from '@/lib/queue';
import { storage } from '@/lib/storage';
// sql imported from @/lib/db

const requestSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(500),
  instructions: z.string().max(500).optional(),
  resolution: z.enum(['512x512', '768x768', '1024x1024']).optional(),
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

    const { imageUrl, prompt, instructions, resolution, async: isAsync } = validation.data;

    // Encode prompt
    const encoder = createPromptEncoder('edit', { style: 'photorealistic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'edit',
      resolution,
      priority: 'quality',
    });

    // Create generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'edit',
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
      // Add to queue
      await generationQueue.enqueue('edit', {
        generationId: generation.id,
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelConfig,
        resolution,
        inputImageUrl: imageUrl,
        userId: session.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          generationId: generation.id,
          status: 'pending',
          message: 'Image edit queued',
        },
      });
    }

    // Synchronous generation
    const result = await editImage(modelConfig, enhancedPrompt, imageUrl, instructions);

    if (!result.success || !result.url) {
      await db
        .update(generations)
        .set({
          status: 'failed',
          error: result.error || 'Edit failed',
        })
        .where(sql => sql.eq(generations.id, generation.id));

      return NextResponse.json(
        { success: false, error: result.error || 'Edit failed' },
        { status: 500 }
      );
    }

    // Upload to storage
    const upload = await storage.uploadFromUrl(result.url, 'images');

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
    console.error('Image edit error:', error);
    
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
