'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getSupportedExtensions, getMimeTypeMapping } from '@/lib/client-utils';

interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
  paragraphs_count?: number;
  filename?: string;
}

interface KnowledgeBaseUploadProps {
  onUploadSuccess?: () => void;
}

export default function KnowledgeBaseUpload({ onUploadSuccess }: KnowledgeBaseUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: data.message || 'File uploaded successfully!',
        });
        onUploadSuccess?.();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const supportedExtensions = getSupportedExtensions();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getMimeTypeMapping(),
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="w-full space-y-4">
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
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading ? (
            <div className="font-medium text-primary">
              Uploading and processing...
            </div>
          ) : isDragActive ? (
            <div className="font-medium text-primary">
              Drop the file here
            </div>
          ) : (
            <>
              <div className="font-medium">
                Drag & drop a file here, or click to select
              </div>
              <div className="text-sm text-muted-foreground">
                Supported formats: {supportedExtensions.join(', ')}
              </div>
            </>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`
            p-4 rounded-lg border
            ${message.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800' : ''}
            ${message.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <div className="flex-1">{message.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}

