import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db, generations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { generateVideo } from '@/lib/ai/providers';
import { storage } from '@/lib/storage';

// Extend Vercel function timeout to maximum (Pro plan = 300s)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const aspectRatio = formData.get('aspectRatio') as string | null;
    const quality = formData.get('quality') as string | null;
    const duration = formData.get('duration') as string | null;
    const file = formData.get('image') as File | null;
    const providedImageUrl = formData.get('imageUrl') as string | null;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Handle optional image upload (for image-to-video)
    let imageUrl: string | undefined;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = await storage.uploadBuffer(buffer, 'images', file.type);
      imageUrl = upload.publicUrl;
    } else if (providedImageUrl) {
      if (providedImageUrl.startsWith('data:')) {
        const match = providedImageUrl.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          const buffer = Buffer.from(match[2], 'base64');
          const upload = await storage.uploadBuffer(buffer, 'images', match[1]);
          imageUrl = upload.publicUrl;
        }
      } else {
        imageUrl = providedImageUrl;
      }
    }

    // Encode prompt (light enhancement for video)
    const encoder = createPromptEncoder('video', { style: 'cinematic', quality: 'high' });
    const enhancedPrompt = encoder.encode(prompt);

    // Route to xAI video model
    const modelConfig = aiRouter.route({
      type: 'video',
      resolution: aspectRatio || undefined,
      priority: 'quality',
    });

    // Build video generation parameters
    const durationValue = duration ? Math.max(1, Math.min(15, parseInt(duration))) : 5;
    const videoParams: Record<string, unknown> = {
      duration: durationValue,
    };

    if (aspectRatio) {
      videoParams.aspect_ratio = aspectRatio;
    }

    if (quality) {
      videoParams.resolution = quality;
    }

    console.log(`[VIDEO] Generating — duration=${durationValue}s, aspect=${aspectRatio || 'auto'}, quality=${quality || '720p'}, hasImage=${!!imageUrl}`);

    // Create generation record in DB
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'video',
        status: 'processing',
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelUsed: modelConfig.model,
        provider: 'xai',
        resolution: aspectRatio || undefined,
        duration: durationValue,
        inputImageUrl: imageUrl,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
      })
      .returning();

    const generationId = generation.id;
    console.log(`[VIDEO] Created generation ${generationId}, scheduling background processing...`);

    // Schedule background work using Next.js 15 after() API
    // This continues running after the response is sent to the client,
    // using Vercel's waitUntil primitive to keep the function alive.
    after(async () => {
      try {
        console.log(`[VIDEO BG] Starting generation ${generationId}...`);

        const result = await generateVideo(
          modelConfig,
          enhancedPrompt,
          imageUrl,
          videoParams
        );

        console.log(`[VIDEO BG] Generation ${generationId} result:`, JSON.stringify(result, null, 2));

        if (!result.success || !result.url) {
          console.error(`[VIDEO BG] Generation ${generationId} failed:`, result.error);
          await db
            .update(generations)
            .set({
              status: 'failed',
              error: result.error || 'Video generation failed',
            })
            .where(eq(generations.id, generationId));
          return;
        }

        // Upload video to R2 storage (xAI URLs are temporary)
        console.log(`[VIDEO BG] Generation ${generationId}: uploading to R2...`);
        const upload = await storage.uploadFromUrl(result.url, 'videos');
        console.log(`[VIDEO BG] Generation ${generationId}: upload complete:`, upload.publicUrl);

        // Update generation record as completed
        await db
          .update(generations)
          .set({
            status: 'completed',
            outputUrl: upload.publicUrl,
            metadata: result.metadata,
            completedAt: new Date(),
          })
          .where(eq(generations.id, generationId));

        console.log(`[VIDEO BG] ✅ Generation ${generationId} completed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[VIDEO BG] ❌ Generation ${generationId} error:`, errorMessage);

        await db
          .update(generations)
          .set({
            status: 'failed',
            error: errorMessage,
          })
          .where(eq(generations.id, generationId))
          .catch((dbErr) => console.error(`[VIDEO BG] Failed to update error status:`, dbErr));
      }
    });

    // Return immediately — the video generation continues in the background
    return NextResponse.json({
      success: true,
      data: {
        generationId,
        status: 'processing',
        message: 'Video generation started. Poll /api/generations/{id} for status.',
      },
    });
  } catch (error) {
    console.error('[VIDEO] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
