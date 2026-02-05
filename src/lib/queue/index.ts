import { Redis } from '@upstash/redis';
import { GenerationJob, GenerationJobPayload, GenerationType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const QUEUE_KEY = 'generation:queue';
const PROCESSING_KEY = 'generation:processing';
const DLQ_KEY = 'generation:dlq';
const JOB_PREFIX = 'job:';

export class GenerationQueue {
  async enqueue(
    type: GenerationType,
    payload: GenerationJobPayload,
    priority: number = 1
  ): Promise<GenerationJob> {
    const job: GenerationJob = {
      id: uuidv4(),
      generationId: payload.generationId || uuidv4(),
      type,
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    // Store job data
    await redis.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(job));
    
    // Add to queue with priority (lower number = higher priority)
    const score = Date.now() + priority * 1000;
    await redis.zadd(QUEUE_KEY, { score, member: job.id });

    return job;
  }

  async dequeue(): Promise<GenerationJob | null> {
    // Get job with lowest score (highest priority)
    const jobIds = await redis.zrange(QUEUE_KEY, 0, 0);
    
    if (!jobIds || jobIds.length === 0) {
      return null;
    }

    const jobId = jobIds[0];
    
    // Remove from queue
    await redis.zrem(QUEUE_KEY, jobId);
    
    // Add to processing
    await redis.zadd(PROCESSING_KEY, { score: Date.now(), member: jobId });

    // Get job data
    const jobData = await redis.get<string>(`${JOB_PREFIX}${jobId}`);
    
    if (!jobData) {
      return null;
    }

    return JSON.parse(jobData) as GenerationJob;
  }

  async complete(jobId: string): Promise<void> {
    await redis.zrem(PROCESSING_KEY, jobId);
    await redis.del(`${JOB_PREFIX}${jobId}`);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const jobData = await redis.get<string>(`${JOB_PREFIX}${jobId}`);
    
    if (!jobData) {
      return;
    }

    const job: GenerationJob = JSON.parse(jobData);
    job.attempts++;

    await redis.zrem(PROCESSING_KEY, jobId);

    if (job.attempts >= job.maxAttempts) {
      // Move to dead letter queue
      await redis.zadd(DLQ_KEY, { score: Date.now(), member: jobId });
      await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify({ ...job, error }));
    } else {
      // Requeue with exponential backoff
      const backoff = Math.pow(2, job.attempts) * 1000;
      const score = Date.now() + backoff;
      await redis.zadd(QUEUE_KEY, { score, member: jobId });
      await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));
    }
  }

  async getQueueSize(): Promise<number> {
    return await redis.zcard(QUEUE_KEY);
  }

  async getProcessingSize(): Promise<number> {
    return await redis.zcard(PROCESSING_KEY);
  }

  async getDLQSize(): Promise<number> {
    return await redis.zcard(DLQ_KEY);
  }

  async getJobStatus(jobId: string): Promise<{
    exists: boolean;
    inQueue: boolean;
    inProcessing: boolean;
    inDLQ: boolean;
    attempts?: number;
  }> {
    const [jobData, inQueue, inProcessing, inDLQ] = await Promise.all([
      redis.get<string>(`${JOB_PREFIX}${jobId}`),
      redis.zscore(QUEUE_KEY, jobId),
      redis.zscore(PROCESSING_KEY, jobId),
      redis.zscore(DLQ_KEY, jobId),
    ]);

    const job = jobData ? (JSON.parse(jobData) as GenerationJob) : null;

    return {
      exists: !!jobData,
      inQueue: inQueue !== null,
      inProcessing: inProcessing !== null,
      inDLQ: inDLQ !== null,
      attempts: job?.attempts,
    };
  }

  async clear(): Promise<void> {
    await redis.del(QUEUE_KEY);
    await redis.del(PROCESSING_KEY);
    await redis.del(DLQ_KEY);
    
    // Clear all job data
    const keys = await redis.keys(`${JOB_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const generationQueue = new GenerationQueue();
