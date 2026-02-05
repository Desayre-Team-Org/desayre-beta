'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatCost } from '@/lib/utils';
import { Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoGeneration {
  id: string;
  type: string;
  status: string;
  prompt: string;
  modelUsed: string;
  resolution: string | null;
  outputUrl: string | null;
  inputImageUrl: string | null;
  costEstimate: string | null;
  createdAt: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchVideos = async (pageNum: number) => {
    try {
      const response = await fetch(`/api/history?type=video&page=${pageNum}&pageSize=20`);
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setVideos(data.data.items);
        } else {
          setVideos((prev) => [...prev, ...data.data.items]);
        }
        setHasMore(data.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Video History</h1>
        <p className="text-text-secondary">View all your generated videos</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-elevated">
            <Video className="h-8 w-8 text-text-secondary" />
          </div>
          <p className="mt-4 text-text-secondary">No videos generated yet</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => (window.location.href = '/studio')}
          >
            Go to Studio
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden p-0">
                <div className="aspect-video bg-surface">
                  {video.outputUrl ? (
                    <video
                      src={video.outputUrl}
                      controls
                      className="h-full w-full object-cover"
                    />
                  ) : video.inputImageUrl ? (
                    <img
                      src={video.inputImageUrl}
                      alt="Input"
                      className="h-full w-full object-cover opacity-50"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Video className="h-12 w-12 text-text-secondary/30" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm text-text-primary">
                    {video.prompt}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(video.status)}
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(video.createdAt)}
                      </span>
                    </div>
                    {video.outputUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(video.outputUrl!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{video.modelUsed}</span>
                    {video.resolution && (
                      <>
                        <span>•</span>
                        <span>{video.resolution}</span>
                      </>
                    )}
                    {video.costEstimate && (
                      <>
                        <span>•</span>
                        <span>{formatCost(parseFloat(video.costEstimate))}</span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}
