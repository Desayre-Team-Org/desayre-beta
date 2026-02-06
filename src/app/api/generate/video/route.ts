import { NextRequest, NextResponse } from 'next/server';
import { db, generations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createPromptEncoder } from '@/lib/ai/systemPromptEngine';
import { aiRouter } from '@/lib/ai/router';
import { generateVideo } from '@/lib/ai/providers';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string;
    const aspectRatio = formData.get('aspectRatio') as string | null;
    const quality = formData.get('quality') as string | null;
    const duration = formData.get('duration') as string | null;
    const providedImageUrl = formData.get('imageUrl') as string | null;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Handle image upload or URL
    let imageUrl: string | undefined;
    let imageUrlForXai: string | undefined;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = await storage.uploadBuffer(buffer, 'images', file.type);
      imageUrl = upload.publicUrl;
      // Use a signed URL to guarantee external access even if the bucket isn't public
      imageUrlForXai = await storage.getSignedDownloadUrl(upload.key);
    } else if (providedImageUrl) {
      if (providedImageUrl.startsWith('data:')) {
        const upload = await storage.uploadBase64(providedImageUrl, 'images');
        imageUrl = upload.publicUrl;
        imageUrlForXai = await storage.getSignedDownloadUrl(upload.key);
      } else {
        try {
          const upload = await storage.uploadFromUrl(providedImageUrl, 'images');
          imageUrl = upload.publicUrl;
          imageUrlForXai = await storage.getSignedDownloadUrl(upload.key);
        } catch {
          // Fallback to the original URL if rehosting fails
          imageUrl = providedImageUrl;
          imageUrlForXai = providedImageUrl;
        }
      }
    }

    // Encode prompt for video
    // When image is provided, use original prompt to preserve fidelity to the reference image
    const encoder = createPromptEncoder('video', { style: 'cinematic', quality: 'high' });
    const encodedPrompt = encoder.encode(prompt);
    
    // For img2video, use original prompt to preserve subject identity
    const enhancedPrompt = {
      ...encodedPrompt,
      enhanced: imageUrl ? prompt : encodedPrompt.enhanced,
    };

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'video',
      resolution: aspectRatio || undefined,
      priority: 'quality',
    });

    // Add video-specific parameters
    const videoParams: Record<string, unknown> = {};
    if (aspectRatio) videoParams.aspect_ratio = aspectRatio;
    if (quality) videoParams.resolution = quality;
    const durationValue = duration ? parseInt(duration) : 5;
    videoParams.duration = durationValue;

    console.log(`[VIDEO] Parameters: aspectRatio=${aspectRatio}, quality=${quality}, duration=${durationValue}`);

    // Create generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.userId,
        type: 'video',
        status: 'processing',
        prompt,
        enhancedPrompt: enhancedPrompt.enhanced,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        resolution: aspectRatio || undefined,
        duration: durationValue,
        inputImageUrl: imageUrl || undefined,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
      })
      .returning();

    console.log('[VIDEO] Starting video generation with config:', modelConfig.model);
    
    // Generate video (async with polling)
    const result = await generateVideo(
      modelConfig,
      enhancedPrompt,
      imageUrlForXai || undefined,
      videoParams
    );
    
    console.log('[VIDEO] Generation result:', JSON.stringify(result, null, 2));

    if (!result.success || !result.url) {
      console.error('[VIDEO] Generation failed:', result.error);
      await db
        .update(generations)
        .set({
          status: 'failed',
          error: result.error || 'Video generation failed',
        })
        .where(eq(generations.id, generation.id));

      return NextResponse.json(
        { success: false, error: result.error || 'Video generation failed' },
        { status: 500 }
      );
    }

    console.log('[VIDEO] Video URL received:', result.url);

    // Upload to storage
    console.log('[VIDEO] Uploading to R2 storage...');
    const upload = await storage.uploadFromUrl(result.url, 'videos');
    console.log('[VIDEO] Upload complete:', upload.publicUrl);

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
    console.error('[VIDEO] Caught error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[VIDEO] Error details:', { message: errorMessage, stack: errorStack });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
