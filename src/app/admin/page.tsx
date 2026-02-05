'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCost, formatDuration } from '@/lib/utils';
import {
  BarChart3,
  ImageIcon,
  Video,
  Clock,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Stats {
  totalGenerations: number;
  totalImages: number;
  totalVideos: number;
  totalCost: number;
  generationsToday: number;
  generationsThisWeek: number;
  generationsThisMonth: number;
  completedGenerations: number;
  failedGenerations: number;
  averageGenerationTime: number;
  successRate: number;
  queueStats: {
    pending: number;
    processing: number;
    failedQueue: number;
  };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </MainLayout>
    );
  }

  if (!stats) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-text-secondary">Failed to load statistics</p>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Generations',
      value: stats.totalGenerations.toLocaleString(),
      icon: BarChart3,
      description: 'All time',
    },
    {
      title: 'Images Generated',
      value: stats.totalImages.toLocaleString(),
      icon: ImageIcon,
      description: 'All time',
    },
    {
      title: 'Videos Generated',
      value: stats.totalVideos.toLocaleString(),
      icon: Video,
      description: 'All time',
    },
    {
      title: 'Total Cost',
      value: formatCost(stats.totalCost),
      icon: DollarSign,
      description: 'All time spend',
    },
  ];

  const timeCards = [
    {
      title: 'Today',
      value: stats.generationsToday,
      label: 'generations',
    },
    {
      title: 'This Week',
      value: stats.generationsThisWeek,
      label: 'generations',
    },
    {
      title: 'This Month',
      value: stats.generationsThisMonth,
      label: 'generations',
    },
  ];

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary">System statistics and monitoring</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <card.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{card.title}</p>
                  <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                  <p className="text-xs text-text-secondary">{card.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time-based Stats */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Activity</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {timeCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-text-secondary">{card.title}</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">{card.value}</p>
                <p className="text-xs text-text-secondary">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance & Queue */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Performance
            </CardTitle>
            <CardDescription>Generation metrics and success rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm text-text-primary">Success Rate</span>
              </div>
              <span className="font-semibold text-success">{stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-sm text-text-primary">Average Time</span>
              </div>
              <span className="font-semibold text-text-primary">
                {formatDuration(stats.averageGenerationTime)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-success">{stats.completedGenerations}</p>
                <p className="text-xs text-text-secondary">Completed</p>
              </div>
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-error">{stats.failedGenerations}</p>
                <p className="text-xs text-text-secondary">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-accent" />
              Queue Status
            </CardTitle>
            <CardDescription>Current job queue state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <span className="text-sm text-text-primary">Pending Jobs</span>
              <span className="font-semibold text-text-primary">{stats.queueStats.pending}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <span className="text-sm text-text-primary">Processing</span>
              <span className="font-semibold text-accent">{stats.queueStats.processing}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <span className="text-sm text-text-primary">Failed Queue</span>
              <span className="font-semibold text-error">{stats.queueStats.failedQueue}</span>
            </div>
            <div className="rounded-lg bg-accent/10 p-4">
              <p className="text-sm text-accent">
                Total Active: {stats.queueStats.pending + stats.queueStats.processing}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
