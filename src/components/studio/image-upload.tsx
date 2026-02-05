'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string, file?: File) => void;
  onClear?: () => void;
}

export function ImageUpload({ value, onChange, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onChange(result, file);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onClear?.();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (preview) {
    return (
      <div className="relative rounded-xl border border-border bg-elevated overflow-hidden">
        <img
          src={preview}
          alt="Uploaded"
          className="w-full aspect-video object-contain"
        />
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-error/80 text-white hover:bg-error transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
        isDragging
          ? 'border-accent bg-accent/5'
          : 'border-border bg-elevated hover:border-accent/50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Upload className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-text-secondary mt-1">
            PNG, JPG, WEBP up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
}
