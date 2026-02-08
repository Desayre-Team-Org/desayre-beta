import { NextRequest, NextResponse } from 'next/server';
import { db, generations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { editImage } from '@/lib/ai/providers';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const contentType = request.headers.get('content-type') || '';
    let file: File | null = null;
    let prompt: string | undefined;
    let instructions: string | null = null;
    let resolution: string | null = null;
    let providedImageUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('image') as File | null;
      prompt = formData.get('prompt') as string;
      instructions = formData.get('instructions') as string | null;
      resolution = formData.get('resolution') as string | null;
      providedImageUrl = formData.get('imageUrl') as string | null;
    } else {
      const body = await request.json().catch(() => null);
      if (body && typeof body === 'object') {
        prompt = typeof body.prompt === 'string' ? body.prompt : undefined;
        instructions = typeof body.instructions === 'string' ? body.instructions : null;
        resolution = typeof body.resolution === 'string' ? body.resolution : null;
        providedImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;
      }
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    let imageUrl = providedImageUrl;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = await storage.uploadBuffer(buffer, 'images', file.type);
      imageUrl = upload.publicUrl;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image is required' },
        { status: 400 }
      );
    }

    const encoder = createPromptEncoder('edit', { style: 'photorealistic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    const modelConfig = aiRouter.route({
      type: 'edit',
      resolution: resolution || undefined,
      priority: 'quality',
    });

    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'edit',
        status: 'processing',
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        resolution: resolution || undefined,
        inputImageUrl: imageUrl,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
      })
      .returning();

    const result = await editImage(modelConfig, enhancedPrompt, imageUrl, instructions || undefined);

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

    const upload = await storage.uploadFromUrl(result.url, 'images');

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
