'use client';

import { Select } from '@/components/ui/select';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'image' | 'edit' | 'video';
}

const modelOptions: Record<string, { value: string; label: string }[]> = {
  image: [
    { value: 'nano-banana-pro', label: 'Nano Banana Pro (Recommended)' },
  ],
  edit: [
    { value: 'grok-imagine-edit', label: 'Grok Imagine Image Edit' },
  ],
  video: [
    { value: 'grok-imagine-video', label: 'Grok Imagine Video' },
  ],
};

const resolutionOptions = [
  { value: '512x512', label: '512x512 (Fast)' },
  { value: '768x768', label: '768x768' },
  { value: '1024x1024', label: '1024x1024 (HD)' },
  { value: '1024x576', label: '1024x576 (Landscape)' },
  { value: '576x1024', label: '576x1024 (Portrait)' },
];

const videoResolutionOptions = [
  { value: '576x320', label: '576x320 (Fast)' },
  { value: '768x432', label: '768x432' },
  { value: '1024x576', label: '1024x576 (HD)' },
];

export function ModelSelector({ value, onChange, type = 'image' }: ModelSelectorProps) {
  return (
    <Select
      label="Model"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={modelOptions[type] || modelOptions.image}
    />
  );
}

export function ResolutionSelector({
  value,
  onChange,
  type = 'image',
}: {
  value: string;
  onChange: (value: string) => void;
  type?: 'image' | 'edit' | 'video';
}) {
  const options = type === 'video' ? videoResolutionOptions : resolutionOptions;
  
  // Filter options based on type
  const filteredOptions = type === 'edit' 
    ? options.filter(o => ['512x512', '768x768', '1024x1024'].includes(o.value))
    : options;

  return (
    <Select
      label="Resolution"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={filteredOptions}
    />
  );
}
