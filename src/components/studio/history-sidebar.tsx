'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { ImageIcon, Video, Wand2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HistoryItem {
  id: string;
  type: 'image' | 'edit' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  outputUrl?: string;
  createdAt: string;
}

interface HistorySidebarProps {
  onSelect?: (item: HistoryItem) => void;
  selectedId?: string;
  refreshTrigger?: number;
}

export function HistorySidebar({
  onSelect,
  selectedId,
  refreshTrigger,
}: HistorySidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/history?pageSize=10');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'edit':
        return <Wand2 className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Done</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-medium text-text-primary">Recent Generations</h3>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-text-secondary">No generations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-surface',
                  selectedId === item.id && 'bg-accent/5'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {item.prompt}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-xs text-text-secondary">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
