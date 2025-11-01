'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Stats {
  exists: boolean;
  collection_name?: string;
  vector_count?: number;
  vector_size?: number;
  distance_metric?: string;
  status?: string;
}

interface StatsCardProps {
  refreshTrigger?: number;
}

export default function StatsCard({ refreshTrigger }: StatsCardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Statistics</CardTitle>
          <CardDescription>Current status of your vector database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Statistics</CardTitle>
          <CardDescription>Current status of your vector database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Base Statistics</CardTitle>
            <CardDescription>Current status of your vector database</CardDescription>
          </div>
          <Button
            onClick={fetchStats}
            variant="ghost"
            size="icon"
            title="Refresh stats"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!stats?.exists ? (
          <div className="text-muted-foreground py-4">
            No knowledge base found. Upload a file to get started.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Vector Count
              </div>
              <div className="text-2xl font-bold">
                {stats.vector_count?.toLocaleString() || 0}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Collection
              </div>
              <div className="text-lg font-semibold truncate">
                {stats.collection_name || 'N/A'}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Vector Size
              </div>
              <div className="text-lg font-semibold">
                {stats.vector_size || 'N/A'}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Distance Metric
              </div>
              <div className="text-lg font-semibold">
                {stats.distance_metric || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

