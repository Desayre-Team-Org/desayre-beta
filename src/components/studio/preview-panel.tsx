'use client';

import { cn } from '@/lib/utils';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewPanelProps {
  imageUrl?: string;
  videoUrl?: string;
  isLoading?: boolean;
  progress?: number;
  status?: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  onDownload?: () => void;
  onRetry?: () => void;
}

export function PreviewPanel({
  imageUrl,
  videoUrl,
  isLoading = false,
  progress = 0,
  status = 'idle',
  error,
  onDownload,
  onRetry,
}: PreviewPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-elevated overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-medium text-text-primary">Preview</h3>
        {imageUrl && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-surface flex items-center justify-center">
        {isLoading ? (
          <LoadingState progress={progress} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated content"
            className="h-full w-full object-contain"
          />
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function LoadingState({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-accent"
            strokeDasharray={175.93}
            strokeDashoffset={175.93 * (1 - progress / 100)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
      </div>
      <p className="text-sm text-text-secondary">Generating...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <span className="text-error text-xl">!</span>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">Generation failed</p>
        <p className="mt-1 text-xs text-text-secondary">{error}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-elevated border border-border">
        <ExternalLink className="h-5 w-5 text-text-secondary" />
      </div>
      <p className="text-sm text-text-secondary">
        Your generated content will appear here
      </p>
    </div>
  );
}
