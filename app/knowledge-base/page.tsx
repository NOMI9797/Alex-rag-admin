'use client';

import { useState } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import KnowledgeBaseUpload from '@/components/KnowledgeBaseUpload';
import StatsCard from '@/components/StatsCard';
import KnowledgeBaseViewer from '@/components/KnowledgeBaseViewer';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function KnowledgeBasePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDeleteMessage({
          type: 'success',
          text: 'Knowledge base deleted successfully',
        });
        setRefreshTrigger(prev => prev + 1);
      } else {
        setDeleteMessage({
          type: 'error',
          text: data.error || 'Failed to delete knowledge base',
        });
      }
    } catch (error) {
      setDeleteMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete knowledge base',
      });
    } finally {
      setShowDeleteModal(false);
      setTimeout(() => setDeleteMessage(null), 5000);
    }
  };

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Knowledge Base Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload and manage your RAG agent's knowledge base
            </p>
          </div>
        </div>

        {/* Delete Message */}
        {deleteMessage && (
          <Alert variant={deleteMessage.type === 'error' ? 'destructive' : 'default'}>
            {deleteMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{deleteMessage.text}</AlertDescription>
          </Alert>
        )}

        <main className="flex flex-1 flex-col gap-4 md:gap-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Knowledge Base</CardTitle>
                <CardDescription>
                  Upload documents to build your agent's knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeBaseUpload onUploadSuccess={handleUploadSuccess} />
              </CardContent>
            </Card>

            {/* Stats Section */}
            <StatsCard refreshTrigger={refreshTrigger} />
          </div>

          {/* Viewer Section */}
          <KnowledgeBaseViewer refreshTrigger={refreshTrigger} />

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete all knowledge base content. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="destructive"
              >
                Delete Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </SidebarInset>
  );
}

