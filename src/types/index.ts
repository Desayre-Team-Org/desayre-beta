export type GenerationType = 'image' | 'edit' | 'video';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ModelProvider = 'modelslabs' | 'xai';

export interface Generation {
  id: string;
  userId: string;
  type: GenerationType;
  status: GenerationStatus;
  prompt: string;
  enhancedPrompt?: string;
  modelUsed: string;
  provider: ModelProvider;
  resolution?: string;
  costEstimate?: number;
  outputUrl?: string;
  inputImageUrl?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface GenerationRequest {
  prompt: string;
  type: GenerationType;
  resolution?: string;
  inputImageUrl?: string;
  editInstructions?: string;
}

export interface GenerationJob {
  id: string;
  generationId: string;
  type: GenerationType;
  payload: GenerationJobPayload;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface GenerationJobPayload {
  prompt: string;
  enhancedPrompt: string;
  modelConfig: ModelConfig;
  resolution?: string;
  inputImageUrl?: string;
  userId: string;
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  endpoint: string;
  headers: Record<string, string>;
  parameters: Record<string, unknown>;
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  tags: string[];
  style: string;
  quality: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerationStats {
  totalGenerations: number;
  totalImages: number;
  totalVideos: number;
  totalCost: number;
  generationsToday: number;
  generationsThisWeek: number;
  generationsThisMonth: number;
  averageGenerationTime: number;
  successRate: number;
}

export interface HistoryFilters {
  type?: GenerationType;
  status?: GenerationStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
