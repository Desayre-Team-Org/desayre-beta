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
    { value: 'grok-imagine-image-i2i', label: 'Grok Imagine Image Edit' },
  ],
  video: [
    { value: 'grok-imagine-video', label: 'Grok Imagine Video' },
  ],
};

// Nano Banana Pro aspect ratios
const resolutionOptions = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '9:16', label: '9:16 (Portrait Vertical)' },
  { value: '2:3', label: '2:3 (Portrait)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '4:5', label: '4:5 (Portrait)' },
  { value: '5:4', label: '5:4 (Landscape)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '3:2', label: '3:2 (Landscape)' },
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
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
