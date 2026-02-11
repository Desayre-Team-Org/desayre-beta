import { NextRequest, NextResponse } from 'next/server';
import { db, generations } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/generations/[id]
 * 
 * Returns the status and result of a generation job.
 * Used by the frontend to poll for video generation completion.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAuth(request);
        const { id } = await params;

        const [generation] = await db
            .select()
            .from(generations)
            .where(
                and(
                    eq(generations.id, id),
                    eq(generations.userId, session.userId)
                )
            )
            .limit(1);

        if (!generation) {
            return NextResponse.json(
                { success: false, error: 'Generation not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: generation.id,
                status: generation.status,
                type: generation.type,
                url: generation.outputUrl || undefined,
                error: generation.error || undefined,
                prompt: generation.prompt,
                modelUsed: generation.modelUsed,
                createdAt: generation.createdAt,
                completedAt: generation.completedAt,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.error('[GENERATION STATUS] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
