'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Shield, Database, HardDrive } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Platform configuration and status</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-accent" />
              API Status
            </CardTitle>
            <CardDescription>Connected AI services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">ModelsLabs</p>
                <p className="text-sm text-text-secondary">Image generation & editing</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">xAI</p>
                <p className="text-sm text-text-secondary">Video generation</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-accent" />
              Storage
            </CardTitle>
            <CardDescription>Cloudflare R2 configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">R2 Bucket</p>
                <p className="text-sm text-text-secondary">Object storage</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">Public Access</p>
                <p className="text-sm text-text-secondary">CDN distribution</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              Database
            </CardTitle>
            <CardDescription>PostgreSQL connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">PostgreSQL</p>
                <p className="text-sm text-text-secondary">Generation records & user data</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Security
            </CardTitle>
            <CardDescription>Authentication & access control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">JWT Authentication</p>
                <p className="text-sm text-text-secondary">Token-based auth</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface p-4">
              <div>
                <p className="font-medium text-text-primary">Rate Limiting</p>
                <p className="text-sm text-text-secondary">API protection</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Platform version and environment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-surface p-4">
              <p className="text-sm text-text-secondary">Version</p>
              <p className="font-medium text-text-primary">1.0.0</p>
            </div>
            <div className="rounded-lg bg-surface p-4">
              <p className="text-sm text-text-secondary">Environment</p>
              <p className="font-medium text-text-primary">Production</p>
            </div>
            <div className="rounded-lg bg-surface p-4">
              <p className="text-sm text-text-secondary">Deployment</p>
              <p className="font-medium text-text-primary">Vercel</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
