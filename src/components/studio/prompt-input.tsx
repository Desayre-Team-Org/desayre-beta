'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = 'Describe what you want to generate...',
  label = 'Prompt',
}: PromptInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSubmit();
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isFocused ? 'border-accent ring-1 ring-accent/20' : 'border-border'
      }`}
    >
      <div className="p-4">
        <label className="mb-2 block text-sm font-medium text-text-secondary">
          {label}
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[120px] border-0 bg-transparent p-0 text-base focus:ring-0"
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border bg-elevated/50 px-4 py-3">
        <div className="text-xs text-text-secondary">
          {value.length}/500 • Press Cmd+Enter to generate
        </div>
        <Button
          onClick={onSubmit}
          isLoading={isLoading}
          disabled={!value.trim() || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Generate
        </Button>
      </div>
    </div>
  );
}
