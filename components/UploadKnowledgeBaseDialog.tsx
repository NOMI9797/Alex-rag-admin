'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";

interface UploadKnowledgeBaseDialogProps {
  open: boolean;
  phoneNumberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadKnowledgeBaseDialog({
  open,
  phoneNumberId,
  onClose,
  onSuccess,
}: UploadKnowledgeBaseDialogProps) {
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setError(null);
      
      // Auto-generate KB name from filename if empty
      if (!knowledgeBaseName) {
        const name = acceptedFiles[0].name
          .replace(/\.[^/.]+$/, "") // Remove extension
          .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars
          .toLowerCase();
        setKnowledgeBaseName(name);
      }
    }
  }, [knowledgeBaseName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/markdown': ['.md', '.markdown'],
    },
    multiple: false,
    disabled: uploading,
  });

  const handleUpload = async () => {
    if (!selectedFile || !knowledgeBaseName) {
      setError('Please select a file and enter a knowledge base name');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('phoneNumberId', phoneNumberId);
      formData.append('knowledgeBaseName', knowledgeBaseName);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 2000);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setKnowledgeBaseName('');
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Upload Knowledge Base</DialogTitle>
                  <DialogDescription>
                    Upload a document to create a new knowledge base for the selected phone number.
                    The collection will be named: <code className="text-xs bg-muted px-1 rounded">{`{last_4_digits}_{kb_name}`}</code>
                  </DialogDescription>
            </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-semibold mb-2">Upload Successful!</p>
            <p className="text-sm text-muted-foreground text-center">
              Knowledge base created and vectors uploaded
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="knowledgeBaseName">Knowledge Base Name</Label>
              <Input
                id="knowledgeBaseName"
                value={knowledgeBaseName}
                onChange={(e) => setKnowledgeBaseName(e.target.value)}
                placeholder="e.g., electrical_appliance"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                This will be used to create the Qdrant collection name: <code className="bg-muted px-1 rounded text-xs">{`{phone_last_4_digits}_{knowledgeBaseName || '...'}`}</code>
                <br />
                <span className="text-xs text-muted-foreground">
                  Example: If phone number ends in 4678, collection will be: <code className="bg-muted px-1 rounded">4678_{knowledgeBaseName || 'kb_name'}</code>
                </span>
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-accent'}
              `}
            >
              <input {...getInputProps()} />

              <div className="flex flex-col items-center gap-4">
                {selectedFile ? (
                  <>
                    <FileText className="w-12 h-12 text-primary" />
                    <div>
                      <div className="font-medium">{selectedFile.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        Choose different file
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    {isDragActive ? (
                      <div className="font-medium text-primary">
                        Drop the file here
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">
                          Drag & drop a file here, or click to select
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Supported formats: .txt, .pdf, .docx, .md
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading and processing...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !knowledgeBaseName || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

