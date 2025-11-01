'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface TextEntry {
  text: string;
  metadata: Record<string, any>;
}

interface ViewResponse {
  success: boolean;
  texts: TextEntry[];
  count: number;
  error?: string;
}

interface KnowledgeBaseViewerProps {
  refreshTrigger?: number;
}

export default function KnowledgeBaseViewer({ refreshTrigger }: KnowledgeBaseViewerProps) {
  const [texts, setTexts] = useState<TextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTexts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/view?limit=100');
      const data: ViewResponse = await response.json();

      if (response.ok && data.success) {
        setTexts(data.texts);
      } else {
        setError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTexts();
  }, [refreshTrigger]);

  const filteredTexts = texts.filter(entry =>
    entry.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Content</CardTitle>
          <CardDescription>View and search your knowledge base</CardDescription>
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
          <CardTitle>Knowledge Base Content</CardTitle>
          <CardDescription>View and search your knowledge base</CardDescription>
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
            <CardTitle>Knowledge Base Content</CardTitle>
            <CardDescription>View and search your knowledge base</CardDescription>
          </div>
          <Button
            onClick={fetchTexts}
            variant="ghost"
            size="icon"
            title="Refresh content"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {texts.length === 0 ? (
          <div className="text-muted-foreground py-4">
            No content found. Upload a file to get started.
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {filteredTexts.length} of {texts.length} paragraphs</span>
            </div>

            <ScrollArea className="h-96 w-full rounded-md border">
              <div className="space-y-3 p-4">
                {filteredTexts.map((entry, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-card p-4"
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {entry.text}
                    </div>
                    {entry.metadata.filename && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {entry.metadata.filename}
                        </Badge>
                        {entry.metadata.paragraph_index !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            ¶{entry.metadata.paragraph_index + 1}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

