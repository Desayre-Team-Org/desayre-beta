import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, generations, sql } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { editImage } from '@/lib/ai/providers';
import { generationQueue } from '@/lib/queue';
import { storage } from '@/lib/storage';

// Helper to parse form data
async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  const prompt = formData.get('prompt') as string;
  const instructions = formData.get('instructions') as string | null;
  const resolution = formData.get('resolution') as string | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  
  return { file, prompt, instructions, resolution, imageUrl };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await requireAuth(request);

    // Parse form data
    const { file, prompt, instructions, resolution, imageUrl: providedImageUrl } = await parseFormData(request);

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Handle image upload or URL
    let imageUrl = providedImageUrl;
    
    if (file) {
      // Upload file to R2
      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = await storage.uploadBuffer(buffer, 'images', file.type);
      imageUrl = upload.publicUrl;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image is required (file or URL)' },
        { status: 400 }
      );
    }

    // Encode prompt
    const encoder = createPromptEncoder('edit', { style: 'photorealistic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'edit',
      resolution: resolution || undefined,
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
        .where(eq(generations.id, generation.id));

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
