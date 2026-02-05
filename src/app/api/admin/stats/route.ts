import { NextRequest, NextResponse } from 'next/server';
import { db, generations, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { eq, gte, and } from 'drizzle-orm';
import { generationQueue } from '@/lib/queue';

export async function GET(request: NextRequest) {
  try {
    // Authenticate as admin
    await requireAdmin(request);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get generation counts
    const [
      totalResult,
      imagesResult,
      videosResult,
      todayResult,
      weekResult,
      monthResult,
      completedResult,
      failedResult,
      costResult,
    ] = await Promise.all([
      // Total generations
      db.select({ count: sql<number>`count(*)` }).from(generations),
      
      // Total images
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(eq(generations.type, 'image')),
      
      // Total videos
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(eq(generations.type, 'video')),
      
      // Today's generations
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(gte(generations.createdAt, today)),
      
      // This week's generations
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(gte(generations.createdAt, weekAgo)),
      
      // This month's generations
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(gte(generations.createdAt, monthAgo)),
      
      // Completed generations
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(eq(generations.status, 'completed')),
      
      // Failed generations
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(eq(generations.status, 'failed')),
      
      // Total cost
      db.select({ total: sql<string>`sum(${generations.costEstimate})` })
        .from(generations)
        .where(eq(generations.status, 'completed')),
    ]);

    // Get queue stats
    const [queueSize, processingSize, dlqSize] = await Promise.all([
      generationQueue.getQueueSize(),
      generationQueue.getProcessingSize(),
      generationQueue.getDLQSize(),
    ]);

    // Calculate average generation time
    const avgTimeResult = await db
      .select({
        avgTime: sql<string>`avg(extract(epoch from (${generations.completedAt} - ${generations.createdAt})))`,
      })
      .from(generations)
      .where(
        and(
          eq(generations.status, 'completed'),
          sql`${generations.completedAt} is not null`
        )
      );

    const total = Number(totalResult[0]?.count || 0);
    const completed = Number(completedResult[0]?.count || 0);
    const failed = Number(failedResult[0]?.count || 0);
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalGenerations: total,
        totalImages: Number(imagesResult[0]?.count || 0),
        totalVideos: Number(videosResult[0]?.count || 0),
        totalCost: parseFloat(costResult[0]?.total || '0'),
        generationsToday: Number(todayResult[0]?.count || 0),
        generationsThisWeek: Number(weekResult[0]?.count || 0),
        generationsThisMonth: Number(monthResult[0]?.count || 0),
        completedGenerations: completed,
        failedGenerations: failed,
        averageGenerationTime: parseFloat(avgTimeResult[0]?.avgTime || '0'),
        successRate: Math.round(successRate * 100) / 100,
        queueStats: {
          pending: queueSize,
          processing: processingSize,
          failedQueue: dlqSize,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('Admin')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
