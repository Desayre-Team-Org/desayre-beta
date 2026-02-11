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
    { value: 'nano-banana-pro', label: 'Nano Banana Pro (Image Edit)' },
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

// xAI Grok Imagine Video aspect ratios and resolutions
const videoAspectRatioOptions = [
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '3:2', label: '3:2 (Landscape)' },
  { value: '2:3', label: '2:3 (Portrait)' },
];

const videoQualityOptions = [
  { value: '720p', label: '720p (HD)' },
  { value: '480p', label: '480p (Fast)' },
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
  const options = type === 'video' ? videoAspectRatioOptions : resolutionOptions;

  return (
    <Select
      label={type === 'video' ? 'Aspect Ratio' : 'Resolution'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
    />
  );
}

export function VideoQualitySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      label="Quality"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={videoQualityOptions}
    />
  );
}
