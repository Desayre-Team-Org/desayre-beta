'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatCost } from '@/lib/utils';
import { ImageIcon, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageGeneration {
  id: string;
  type: string;
  status: string;
  prompt: string;
  modelUsed: string;
  resolution: string | null;
  outputUrl: string | null;
  costEstimate: string | null;
  createdAt: string;
}

export default function ImagesPage() {
  const [images, setImages] = useState<ImageGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchImages = async (pageNum: number) => {
    try {
      const response = await fetch(`/api/history?type=image&page=${pageNum}&pageSize=20`);
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setImages(data.data.items);
        } else {
          setImages((prev) => [...prev, ...data.data.items]);
        }
        setHasMore(data.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(nextPage);
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
        <h1 className="text-2xl font-bold text-text-primary">Image History</h1>
        <p className="text-text-secondary">View all your generated images</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-elevated">
            <ImageIcon className="h-8 w-8 text-text-secondary" />
          </div>
          <p className="mt-4 text-text-secondary">No images generated yet</p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden p-0">
                <div className="aspect-square bg-surface">
                  {image.outputUrl ? (
                    <img
                      src={image.outputUrl}
                      alt={image.prompt}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-text-secondary/30" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm text-text-primary">
                    {image.prompt}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(image.status)}
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(image.createdAt)}
                      </span>
                    </div>
                    {image.outputUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(image.outputUrl!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{image.modelUsed}</span>
                    {image.resolution && (
                      <>
                        <span>•</span>
                        <span>{image.resolution}</span>
                      </>
                    )}
                    {image.costEstimate && (
                      <>
                        <span>•</span>
                        <span>{formatCost(parseFloat(image.costEstimate))}</span>
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
