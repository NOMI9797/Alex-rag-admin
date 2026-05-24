'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Trash2, Loader2, AlertCircle, Eraser } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ConnectionMethodDialog from "@/components/ConnectionMethodDialog";
import AddPhoneNumberDialog from "@/components/AddPhoneNumberDialog";
import ApiKeyConnectionDialog from "@/components/ApiKeyConnectionDialog";

interface PhoneNumber {
  id: string;
  phone_number: string;
  last_4_digits: string;
  status: string;
  error_message?: string;
  has_trunk: boolean;
  has_dispatch_rule: boolean;
  created_at: string;
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [showAuthTokenDialog, setShowAuthTokenDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/phone-numbers');
      const data = await response.json();

      if (response.ok && data.success) {
        setPhoneNumbers(data.phoneNumbers || []);
      } else {
        setError(data.error || 'Failed to fetch phone numbers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this phone number?')) {
      return;
    }

    try {
      const response = await fetch(`/api/twilio/disconnect?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh list
        fetchPhoneNumbers();
      } else {
        alert(data.error || 'Failed to disconnect phone number');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect phone number');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('This will delete all orphaned dispatch rules, inbound trunks, and old rooms. Continue?')) {
      return;
    }

    try {
      setCleaningUp(true);
      const response = await fetch('/api/livekit/cleanup-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const total = 
          data.results.dispatchRules.deleted + 
          data.results.inboundTrunks.deleted + 
          data.results.rooms.deleted;
        
        alert(`Cleanup completed!\n\nDeleted:\n- ${data.results.dispatchRules.deleted} dispatch rules\n- ${data.results.inboundTrunks.deleted} inbound trunks\n- ${data.results.rooms.deleted} rooms`);
        
        // Refresh list
        fetchPhoneNumbers();
      } else {
        alert(data.error || 'Failed to cleanup resources');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cleanup resources');
    } finally {
      setCleaningUp(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      configured: { variant: 'default', label: 'Configured' },
      active: { variant: 'default', label: 'Active' },
      error: { variant: 'destructive', label: 'Error' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Phone Numbers</h2>
            <p className="text-sm text-muted-foreground">
              Connect and manage your Twilio phone numbers
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCleanup} 
              variant="outline" 
              className="gap-2"
              disabled={cleaningUp}
            >
              {cleaningUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-4 w-4" />
              )}
              {cleaningUp ? 'Cleaning...' : 'Cleanup Resources'}
            </Button>
            <Button onClick={() => setShowMethodSelection(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Phone Number
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <main className="flex flex-1 flex-col gap-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : phoneNumbers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No phone numbers yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by connecting your first Twilio phone number
                  </p>
                  <Button onClick={() => setShowMethodSelection(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Phone Number
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {phoneNumbers.map((phoneNumber) => (
                <Card key={phoneNumber.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {phoneNumber.phone_number}
                        </CardTitle>
                      </div>
                      {getStatusBadge(phoneNumber.status)}
                    </div>
                    <CardDescription>
                      Last 4 digits: {phoneNumber.last_4_digits}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">SIP Trunk:</span>
                        <Badge variant={phoneNumber.has_trunk ? 'default' : 'secondary'}>
                          {phoneNumber.has_trunk ? 'Connected' : 'Not configured'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Dispatch Rule:</span>
                        <Badge variant={phoneNumber.has_dispatch_rule ? 'default' : 'secondary'}>
                          {phoneNumber.has_dispatch_rule ? 'Active' : 'Not configured'}
                        </Badge>
                      </div>

                      {phoneNumber.error_message && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {phoneNumber.error_message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="pt-2">
                        <Button
                          onClick={() => handleDelete(phoneNumber.id)}
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      <ConnectionMethodDialog
        open={showMethodSelection}
        onClose={() => setShowMethodSelection(false)}
        onSelectMethod={(method) => {
          setShowMethodSelection(false);
          if (method === 'auth_token') {
            setShowAuthTokenDialog(true);
          } else {
            setShowApiKeyDialog(true);
          }
        }}
      />

      <AddPhoneNumberDialog
        open={showAuthTokenDialog}
        onClose={() => setShowAuthTokenDialog(false)}
        onSuccess={() => {
          setShowAuthTokenDialog(false);
          fetchPhoneNumbers();
        }}
      />

      <ApiKeyConnectionDialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onSuccess={() => {
          setShowApiKeyDialog(false);
          fetchPhoneNumbers();
        }}
      />
    </SidebarInset>
  );
}

