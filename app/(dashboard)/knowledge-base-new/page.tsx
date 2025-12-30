'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Upload, Trash2, Loader2, AlertCircle, Search, FileText } from "lucide-react";
import UploadKnowledgeBaseDialog from "@/components/UploadKnowledgeBaseDialog";

interface PhoneNumber {
  id: string;
  phone_number: string;
  last_4_digits: string;
  status: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  collection_name: string;
  file_name: string;
  file_size: number;
  file_type: string;
  vector_count: number;
  status: string;
  error_message?: string;
  created_at: string;
}

export default function KnowledgeBaseNewPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers');
      const data = await response.json();

      if (response.ok && data.success) {
        // Filter out phone numbers that don't start with '+' (invalid format)
        // Also filter out phone numbers with error status
        const validPhoneNumbers = (data.phoneNumbers || []).filter(
          (pn: PhoneNumber) => 
            pn.phone_number.startsWith('+') && 
            pn.status !== 'error'
        );
        
        setPhoneNumbers(validPhoneNumbers);
        
        // Select first valid phone number by default
        if (validPhoneNumbers.length > 0) {
          setSelectedPhoneNumber(validPhoneNumbers[0].id);
        } else {
          // No valid phone numbers - clear selection
          setSelectedPhoneNumber(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch phone numbers:', err);
    }
  };

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = selectedPhoneNumber
        ? `/api/knowledge-base?phoneNumberId=${selectedPhoneNumber}`
        : '/api/knowledge-base';

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.success) {
        setKnowledgeBases(data.knowledgeBases || []);
      } else {
        setError(data.error || 'Failed to fetch knowledge bases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  useEffect(() => {
    if (selectedPhoneNumber) {
      fetchKnowledgeBases();
    }
  }, [selectedPhoneNumber]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base? This will remove all vectors from Qdrant.')) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchKnowledgeBases();
      } else {
        alert(data.error || 'Failed to delete knowledge base');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete knowledge base');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      uploading: { variant: 'secondary', label: 'Uploading' },
      processing: { variant: 'secondary', label: 'Processing' },
      ready: { variant: 'default', label: 'Ready' },
      error: { variant: 'destructive', label: 'Error' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredKnowledgeBases = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kb.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              Upload and manage knowledge bases for your phone numbers. Each KB is linked to a specific phone number.
            </p>
          </div>
          <Button
            onClick={() => setShowUploadDialog(true)}
            disabled={!selectedPhoneNumber}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Knowledge Base
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Phone Number Selector */}
        {phoneNumbers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Phone Number</CardTitle>
              <CardDescription>
                Choose which phone number to manage. Knowledge bases are stored per phone number using the last 4 digits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {phoneNumbers.map((pn) => (
                  <Button
                    key={pn.id}
                    variant={selectedPhoneNumber === pn.id ? 'default' : 'outline'}
                    onClick={() => setSelectedPhoneNumber(pn.id)}
                    className="justify-start"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    {pn.phone_number}
                    <Badge variant="secondary" className="ml-auto">
                      {pn.last_4_digits}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {phoneNumbers.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No phone numbers configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to connect a phone number before uploading knowledge bases.
                  <br />
                  <span className="text-xs">
                    Knowledge bases are stored per phone number using the format: <code className="bg-muted px-1 rounded">{`{last_4_digits}/{kb_name}`}</code>
                  </span>
                </p>
                <Button onClick={() => window.location.href = '/phone-numbers'}>
                  Connect Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPhoneNumber && (
          <main className="flex flex-1 flex-col gap-4">
            {/* Search */}
            {knowledgeBases.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search knowledge bases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Badge variant="secondary">
                  {filteredKnowledgeBases.length} of {knowledgeBases.length}
                </Badge>
              </div>
            )}

            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : knowledgeBases.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No knowledge bases yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your first knowledge base to get started
                    </p>
                    <Button 
                      onClick={() => setShowUploadDialog(true)} 
                      disabled={!selectedPhoneNumber}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Knowledge Base
                    </Button>
                    {!selectedPhoneNumber && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Please select a phone number above first
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredKnowledgeBases.map((kb) => (
                  <Card key={kb.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg truncate">{kb.name}</CardTitle>
                          <CardDescription className="truncate">{kb.file_name}</CardDescription>
                        </div>
                        {getStatusBadge(kb.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-1 font-medium">.{kb.file_type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <span className="ml-1 font-medium">{formatFileSize(kb.file_size)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Vectors:</span>
                            <span className="ml-1 font-medium">{kb.vector_count.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Collection: {kb.collection_name}
                        </div>

                        {kb.error_message && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {kb.error_message}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="pt-2">
                          <Button
                            onClick={() => handleDelete(kb.id)}
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {selectedPhoneNumber && (
        <UploadKnowledgeBaseDialog
          open={showUploadDialog}
          phoneNumberId={selectedPhoneNumber}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => {
            setShowUploadDialog(false);
            fetchKnowledgeBases();
          }}
        />
      )}
    </SidebarInset>
  );
}

