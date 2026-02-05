import { NextRequest, NextResponse } from 'next/server';
import { generationQueue } from '@/lib/queue';
import { db, generations, sql } from '@/lib/db';
import { generateImage, editImage, generateVideo } from '@/lib/ai/providers';
import { storage } from '@/lib/storage';
// sql imported from @/lib/db

// This route processes queued generation jobs
// It should be called by a cron job or queue worker

export async function POST(request: NextRequest) {
  try {
    // Verify worker secret if configured
    const authHeader = request.headers.get('authorization');
    const workerSecret = process.env.WORKER_SECRET;
    
    if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process jobs from queue
    const results = [];
    const maxJobs = 5; // Process max 5 jobs per request

    for (let i = 0; i < maxJobs; i++) {
      const job = await generationQueue.dequeue();
      
      if (!job) break;

      try {
        await db
          .update(generations)
          .set({ status: 'processing' })
          .where(sql => sql.eq(generations.id, job.payload.generationId));

        let result;

        switch (job.type) {
          case 'image':
            result = await generateImage(
              job.payload.modelConfig,
              { 
                original: job.payload.prompt,
                enhanced: job.payload.enhancedPrompt,
                tags: [],
                style: 'photorealistic',
                quality: 0.85
              },
              { negativePrompt: '' }
            );
            break;

          case 'edit':
            if (!job.payload.inputImageUrl) {
              throw new Error('Input image URL required for edit');
            }
            result = await editImage(
              job.payload.modelConfig,
              {
                original: job.payload.prompt,
                enhanced: job.payload.enhancedPrompt,
                tags: [],
                style: 'photorealistic',
                quality: 0.85
              },
              job.payload.inputImageUrl
            );
            break;

          case 'video':
            if (!job.payload.inputImageUrl) {
              throw new Error('Input image URL required for video');
            }
            result = await generateVideo(
              job.payload.modelConfig,
              {
                original: job.payload.prompt,
                enhanced: job.payload.enhancedPrompt,
                tags: [],
                style: 'cinematic',
                quality: 0.85
              },
              job.payload.inputImageUrl
            );
            break;

          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        if (!result.success || !result.url) {
          throw new Error(result.error || 'Generation failed');
        }

        // Upload to storage
        const upload = await storage.uploadFromUrl(
          result.url,
          job.type === 'video' ? 'videos' : 'images'
        );

        // Update generation record
        await db
          .update(generations)
          .set({
            status: 'completed',
            outputUrl: upload.publicUrl,
            metadata: result.metadata,
            completedAt: new Date(),
          })
          .where(sql => sql.eq(generations.id, job.payload.generationId));

        await generationQueue.complete(job.id);

        results.push({
          jobId: job.id,
          generationId: job.payload.generationId,
          status: 'completed',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await generationQueue.fail(job.id, errorMessage);
        
        await db
          .update(generations)
          .set({
            status: 'failed',
            error: errorMessage,
          })
          .where(sql => sql.eq(generations.id, job.payload.generationId));

        results.push({
          jobId: job.id,
          generationId: job.payload.generationId,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const workerSecret = process.env.WORKER_SECRET;
    
    if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [pending, processing, failed] = await Promise.all([
      generationQueue.getQueueSize(),
      generationQueue.getProcessingSize(),
      generationQueue.getDLQSize(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queue: { pending, processing, failed },
        total: pending + processing + failed,
      },
    });
  } catch (error) {
    console.error('Worker status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
