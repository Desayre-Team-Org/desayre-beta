import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, generations, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { GenerationType, GenerationStatus } from '@/types';

const querySchema = z.object({
  type: z.enum(['image', 'edit', 'video']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await requireAuth(request);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = querySchema.safeParse({
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: query.error.errors },
        { status: 400 }
      );
    }

    const { type, status, page, pageSize, startDate, endDate, search } = query.data;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [eq(generations.userId, session.userId)];

    if (type) {
      conditions.push(eq(generations.type, type));
    }

    if (status) {
      conditions.push(eq(generations.status, status));
    }

    if (startDate) {
      conditions.push(gte(generations.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(generations.createdAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        sql`${generations.prompt} ILIKE ${`%${search}%`}`
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .where(and(...conditions));
    
    const total = Number(countResult[0]?.count || 0);

    // Get items
    const items = await db
      .select({
        id: generations.id,
        type: generations.type,
        status: generations.status,
        prompt: generations.prompt,
        modelUsed: generations.modelUsed,
        resolution: generations.resolution,
        outputUrl: generations.outputUrl,
        inputImageUrl: generations.inputImageUrl,
        costEstimate: generations.costEstimate,
        metadata: generations.metadata,
        createdAt: generations.createdAt,
        completedAt: generations.completedAt,
      })
      .from(generations)
      .where(and(...conditions))
      .orderBy(desc(generations.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: offset + items.length < total,
      },
    });
  } catch (error) {
    console.error('History fetch error:', error);
    
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
