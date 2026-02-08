'use client';

import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { PromptInput } from '@/components/studio/prompt-input';
import { ModelSelector, ResolutionSelector, VideoQualitySelector } from '@/components/studio/model-selector';
import { ImageUpload } from '@/components/studio/image-upload';
import { ReferenceImagesUpload, ReferenceImageItem } from '@/components/studio/reference-images-upload';
import { PreviewPanel } from '@/components/studio/preview-panel';
import { HistorySidebar } from '@/components/studio/history-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type GenerationType = 'image' | 'edit' | 'video';

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url?: string; error?: string }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [inputImageFile, setInputImageFile] = useState<File | null>(null);
  const [videoQuality, setVideoQuality] = useState('720p');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoModel, setVideoModel] = useState('grok-imagine-video');
  const [referenceImages, setReferenceImages] = useState<ReferenceImageItem[]>([]);
  const [editStrength, setEditStrength] = useState(0.35);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setResult({});

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 15;
      });
    }, 1000);

    try {
      const endpoint = `/api/generate/${activeTab}`;
      
      let body: BodyInit;
      let headers: Record<string, string> = {};
      
      // For edit mode, use FormData to support file upload
      if (activeTab === 'edit') {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('resolution', resolution);
        formData.append('strength', editStrength.toString());
        
        if (inputImageFile) {
          formData.append('image', inputImageFile);
        } else if (inputImageUrl) {
          formData.append('imageUrl', inputImageUrl);
        } else {
          setResult({ error: 'Please upload an image or provide an image URL' });
          setIsGenerating(false);
          clearInterval(progressInterval);
          return;
        }
        
        body = formData;
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else if (activeTab === 'video') {
        // For video, use FormData to support image upload
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('aspectRatio', resolution);
        formData.append('quality', videoQuality);
        formData.append('duration', videoDuration.toString());
        formData.append('model', videoModel);
        
        if (inputImageFile) {
          formData.append('image', inputImageFile);
        } else if (inputImageUrl) {
          formData.append('imageUrl', inputImageUrl);
        }

        if (referenceImages.length > 0) {
          referenceImages.forEach((item) => formData.append('referenceImages', item.file));
        }
        
        body = formData;
      } else {
        // For image, use JSON
        const jsonBody: Record<string, unknown> = {
          prompt,
          resolution,
        };
        
        body = JSON.stringify(jsonBody);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const data = await response.json();
      
      console.log('Generation response:', data);

      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        console.log('Setting result URL:', data.data.url);
        setResult({ url: data.data.url });
        setRefreshTrigger((t) => t + 1);
      } else {
        setResult({ error: data.error || 'Generation failed' });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setResult({ error: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    resolution,
    activeTab,
    inputImageUrl,
    inputImageFile,
    videoQuality,
    videoDuration,
    videoModel,
    referenceImages,
    editStrength,
  ]);

  const tabs = [
    { id: 'image' as const, label: 'Image', icon: Sparkles },
    { id: 'edit' as const, label: 'Edit', icon: ImageIcon },
    { id: 'video' as const, label: 'Video', icon: Video },
  ];

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Studio</h1>
        <p className="text-text-secondary">Generate images, edits, and videos with AI</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-elevated p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Generation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt Input */}
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            placeholder={
              activeTab === 'image'
                ? 'Describe the image you want to generate...'
                : activeTab === 'edit'
                ? 'Describe how you want to edit the image...'
                : 'Describe the video motion you want...'
            }
          />

          {/* Options */}
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTab === 'video' && (
                  <ModelSelector
                    value={videoModel}
                    onChange={(value) => setVideoModel(value)}
                    type="video"
                  />
                )}
                <ResolutionSelector
                  value={resolution}
                  onChange={setResolution}
                  type={activeTab}
                />
                {activeTab === 'edit' && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Upload Image
                    </label>
                    <ImageUpload
                      value={inputImageUrl}
                      onChange={(url, file) => {
                        setInputImageUrl(url);
                        if (file) setInputImageFile(file);
                      }}
                      onClear={() => {
                        setInputImageUrl('');
                        setInputImageFile(null);
                      }}
                    />
                    <p className="mt-1.5 text-xs text-text-secondary">
                      Drag & drop or click to upload PNG, JPG, WEBP
                    </p>
                  </div>
                )}
                {activeTab === 'edit' && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Edit Strength
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={editStrength}
                      onChange={(e) => setEditStrength(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                      <span>More faithful</span>
                      <span className="font-medium text-text-primary">{editStrength.toFixed(2)}</span>
                      <span>More creative</span>
                    </div>
                  </div>
                )}
                {activeTab === 'video' && (
                  <>
                    <div>
                      <VideoQualitySelector
                        value={videoQuality}
                        onChange={setVideoQuality}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                        Duration (seconds)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-text-secondary mt-1">
                        <span>1s</span>
                        <span className="font-medium text-text-primary">{videoDuration}s</span>
                        <span>15s</span>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                        Input Image (Optional)
                      </label>
                      <ImageUpload
                        value={inputImageUrl}
                        onChange={(url, file) => {
                          setInputImageUrl(url);
                          if (file) setInputImageFile(file);
                        }}
                        onClear={() => {
                          setInputImageUrl('');
                          setInputImageFile(null);
                        }}
                      />
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Upload an image to generate video from it, or leave empty for text-to-video
                      </p>
                    </div>
                    {videoModel === 'higgsfield-soul-video' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                          Reference Images (Soul Mode)
                        </label>
                        <ReferenceImagesUpload
                          items={referenceImages}
                          onChange={setReferenceImages}
                          max={5}
                        />
                        <p className="mt-1.5 text-xs text-text-secondary">
                          Use 1–5 reference images to preserve identity. The input image above is also included if provided.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <PreviewPanel
            imageUrl={activeTab !== 'video' ? result.url : undefined}
            videoUrl={activeTab === 'video' ? result.url : undefined}
            isLoading={isGenerating}
            progress={progress}
            status={isGenerating ? 'processing' : result.error ? 'failed' : result.url ? 'completed' : 'idle'}
            error={result.error}
            onRetry={handleGenerate}
            onDownload={() => result.url && window.open(result.url, '_blank')}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <HistorySidebar
            refreshTrigger={refreshTrigger}
            onSelect={(item) => {
              if (item.outputUrl) {
                setResult({ url: item.outputUrl });
              }
            }}
          />
        </div>
      </div>
    </MainLayout>
  );
}
