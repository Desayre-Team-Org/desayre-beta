'use client';

import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReferenceImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface ReferenceImagesUploadProps {
  items: ReferenceImageItem[];
  onChange: (items: ReferenceImageItem[]) => void;
  max?: number;
}

export function ReferenceImagesUpload({
  items,
  onChange,
  max = 5,
}: ReferenceImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (files: FileList | null) => {
    if (!files) return;

    const next = [...items];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (next.length >= max) break;
      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl,
      });
    }

    onChange(next);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    const removed = items.find((item) => item.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Add up to {max} reference images
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={items.length >= max}
          className={cn(
            'rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition-colors',
            items.length >= max
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-accent'
          )}
        >
          <span className="inline-flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Add
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleAdd(e.target.files)}
      />

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-elevated p-6 text-center text-sm text-text-secondary">
          Drop reference images here or click Add
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative rounded-lg border border-border bg-elevated">
              <img
                src={item.previewUrl}
                alt="Reference"
                className="h-24 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
