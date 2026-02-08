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
    const model = formData.get('model') as string | null;
    const prompt = formData.get('prompt') as string;
    const aspectRatio = formData.get('aspectRatio') as string | null;
    const quality = formData.get('quality') as string | null;
    const duration = formData.get('duration') as string | null;
    const providedImageUrl = formData.get('imageUrl') as string | null;
    const referenceImageUrlsRaw = formData.get('referenceImageUrls') as string | null;
    const referenceFiles = formData.getAll('referenceImages') as File[];

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const uploadFromFile = async (fileToUpload: File) => {
      const buffer = Buffer.from(await fileToUpload.arrayBuffer());
      const upload = await storage.uploadBuffer(buffer, 'images', fileToUpload.type);
      const signedUrl = await storage.getSignedDownloadUrl(upload.key);
      return { publicUrl: upload.publicUrl, signedUrl };
    };

    const uploadFromUrl = async (url: string) => {
      if (url.startsWith('data:')) {
        const upload = await storage.uploadBase64(url, 'images');
        const signedUrl = await storage.getSignedDownloadUrl(upload.key);
        return { publicUrl: upload.publicUrl, signedUrl };
      }

      try {
        const upload = await storage.uploadFromUrl(url, 'images');
        const signedUrl = await storage.getSignedDownloadUrl(upload.key);
        return { publicUrl: upload.publicUrl, signedUrl };
      } catch {
        return { publicUrl: url, signedUrl: url };
      }
    };

    // Handle image upload or URL
    let imageUrl: string | undefined;
    let imageUrlForXai: string | undefined;
    const referenceSignedUrls: string[] = [];
    const referencePublicUrls: string[] = [];

    if (file) {
      const upload = await uploadFromFile(file);
      imageUrl = upload.publicUrl;
      imageUrlForXai = upload.signedUrl;
      referenceSignedUrls.push(upload.signedUrl);
      referencePublicUrls.push(upload.publicUrl);
    } else if (providedImageUrl) {
      const upload = await uploadFromUrl(providedImageUrl);
      imageUrl = upload.publicUrl;
      imageUrlForXai = upload.signedUrl;
      referenceSignedUrls.push(upload.signedUrl);
      referencePublicUrls.push(upload.publicUrl);
    }

    if (referenceImageUrlsRaw) {
      try {
        const parsed = JSON.parse(referenceImageUrlsRaw);
        if (Array.isArray(parsed)) {
          for (const url of parsed) {
            if (typeof url === 'string' && url.trim()) {
              const upload = await uploadFromUrl(url);
              referenceSignedUrls.push(upload.signedUrl);
              referencePublicUrls.push(upload.publicUrl);
            }
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    if (referenceFiles.length > 0) {
      for (const refFile of referenceFiles) {
        if (refFile && refFile.type?.startsWith('image/')) {
          const upload = await uploadFromFile(refFile);
          referenceSignedUrls.push(upload.signedUrl);
          referencePublicUrls.push(upload.publicUrl);
        }
      }
    }

    if (referenceSignedUrls.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 5 reference images allowed.' },
        { status: 400 }
      );
    }

    if (referencePublicUrls.length > 0) {
      imageUrl = imageUrl || referencePublicUrls[0];
    }
    if (referenceSignedUrls.length > 0) {
      imageUrlForXai = imageUrlForXai || referenceSignedUrls[0];
    }

    // Encode prompt for video
    // When image is provided, use original prompt to preserve fidelity to the reference image
    const encoder = createPromptEncoder('video', { style: 'cinematic', quality: 'high' });
    const encodedPrompt = encoder.encode(prompt);
    
    // For img2video, strongly instruct identity/appearance consistency
    const imageConsistencyPrefix = referenceSignedUrls.length > 0
      ? 'Use the provided reference images as the first frame(s). Preserve the subject identity, face, hair, body proportions, clothing, and background. Only animate the motion described. '
      : '';

    // For img2video, use original prompt to preserve subject identity
    const enhancedPrompt = {
      ...encodedPrompt,
      enhanced: referenceSignedUrls.length > 0 ? `${imageConsistencyPrefix}${prompt}` : encodedPrompt.enhanced,
    };

    // Route to model
    const modelConfig = aiRouter.route({
      type: 'video',
      resolution: aspectRatio || undefined,
      priority: 'quality',
      modelId: model || undefined,
    });

    // Add video-specific parameters
    const videoParams: Record<string, unknown> = {};
    if (aspectRatio) videoParams.aspect_ratio = aspectRatio;
    if (quality) videoParams.resolution = quality;
    const durationValue = duration ? parseInt(duration) : 5;
    videoParams.duration = durationValue;

    console.log(`[VIDEO] Parameters: aspectRatio=${aspectRatio}, quality=${quality}, duration=${durationValue}`);

    if (modelConfig.provider === 'higgsfield' && referenceSignedUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Higgsfield Soul requires at least one reference image.' },
        { status: 400 }
      );
    }
    if (modelConfig.provider === 'xai' && !imageUrlForXai) {
      return NextResponse.json(
        { success: false, error: 'xAI video requires a reference image.' },
        { status: 400 }
      );
    }

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
        inputImageUrl: imageUrl || referencePublicUrls[0] || undefined,
        costEstimate: aiRouter.estimateCost(modelConfig.model).toString(),
        metadata: referencePublicUrls.length > 0 ? { referenceImages: referencePublicUrls } : undefined,
      })
      .returning();

    if (modelConfig.provider === 'xai' && imageUrlForXai) {
      try {
        const head = await fetch(imageUrlForXai, { method: 'HEAD' });
        if (!head.ok) {
          const get = await fetch(imageUrlForXai, { method: 'GET' });
          get.body?.cancel();
          if (!get.ok) {
            return NextResponse.json(
              { success: false, error: 'Reference image URL is not accessible to the video provider.' },
              { status: 400 }
            );
          }
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to verify reference image accessibility.' },
          { status: 400 }
        );
      }
    }

    console.log('[VIDEO] Starting video generation with config:', modelConfig.model);
    
    // Generate video (async with polling)
    let result = await generateVideo(
      modelConfig,
      enhancedPrompt,
      modelConfig.provider === 'xai' ? imageUrlForXai || undefined : undefined,
      {
        ...videoParams,
        ...(modelConfig.provider === 'higgsfield'
          ? { referenceImageUrls: referenceSignedUrls }
          : {}),
      }
    );

    let finalProvider = modelConfig.provider;
    let finalModel = modelConfig.model;
    let fallbackInfo: Record<string, unknown> | undefined;

    if (
      !result.success &&
      modelConfig.provider === 'higgsfield' &&
      /nsfw/i.test(result.error || '')
    ) {
      const fallbackModelConfig = aiRouter.route({
        type: 'video',
        resolution: aspectRatio || undefined,
        priority: 'quality',
        modelId: 'grok-imagine-video',
      });

      const fallbackImageUrl =
        imageUrlForXai || referenceSignedUrls[0] || undefined;

      const fallbackResult = await generateVideo(
        fallbackModelConfig,
        enhancedPrompt,
        fallbackImageUrl,
        videoParams
      );

      if (fallbackResult.success) {
        fallbackInfo = {
          fallbackFrom: modelConfig.provider,
          fallbackReason: result.error,
        };
        result = fallbackResult;
        finalProvider = fallbackModelConfig.provider;
        finalModel = fallbackModelConfig.model;
      } else {
        result = {
          success: false,
          error: `Higgsfield blocked (NSFW). Fallback failed: ${fallbackResult.error || 'Unknown error'}`,
          metadata: fallbackResult.metadata,
        };
      }
    }
    
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
        provider: finalProvider,
        modelUsed: finalModel,
        metadata: {
          ...(result.metadata || {}),
          ...(referencePublicUrls.length > 0 ? { referenceImages: referencePublicUrls } : {}),
          ...(fallbackInfo ? { fallback: fallbackInfo } : {}),
        },
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
