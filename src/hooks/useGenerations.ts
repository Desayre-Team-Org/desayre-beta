'use client';

import { useState, useCallback } from 'react';

interface UseGenerationsOptions {
  type?: 'image' | 'edit' | 'video';
}

export function useGenerations(options: UseGenerationsOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    prompt: string,
    config: {
      resolution?: string;
      imageUrl?: string;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `/api/generate/${options.type || 'image'}`;
      const body: Record<string, unknown> = {
        prompt,
        resolution: config.resolution,
      };

      if (config.imageUrl && (options.type === 'edit' || options.type === 'video')) {
        body.imageUrl = config.imageUrl;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.type]);

  return {
    generate,
    isLoading,
    error,
  };
}
