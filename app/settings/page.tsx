'use client';

import { useState } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Phone } from "lucide-react";

export default function SettingsPage() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    phone_number: '',
    twilio_account_sid: '',
    twilio_api_key: '',
    twilio_api_secret: '',
  });

  const handleConnect = async () => {
    // Validate all fields
    if (!formData.phone_number || !formData.twilio_account_sid || !formData.twilio_api_key || !formData.twilio_api_secret) {
      setError('All fields are required');
      return;
    }

    try {
      setConnecting(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/livekit/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          // Reset form
          setFormData({
            phone_number: '',
            twilio_account_sid: '',
            twilio_api_key: '',
            twilio_api_secret: '',
          });
          // Redirect to phone numbers page
          window.location.href = '/phone-numbers';
        }, 2000);
      } else {
        setError(data.error || 'Failed to connect phone number');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect phone number');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure your LiveKit and agent settings
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Phone number connected successfully! Redirecting...</AlertDescription>
          </Alert>
        )}

        <main className="flex flex-1 flex-col gap-4 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Connect Phone Number</CardTitle>
              <CardDescription>
                Enter phone number and Twilio credentials. LiveKit SIP URI from .env.local will be used for dispatch rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+1234567890"
                    disabled={connecting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter phone number in E.164 format (to receive calls)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
                  <Input
                    id="twilio_account_sid"
                    value={formData.twilio_account_sid}
                    onChange={(e) =>
                      setFormData({ ...formData, twilio_account_sid: e.target.value })
                    }
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    disabled={connecting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Twilio Account SID (starts with AC)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilio_api_key">Twilio API Key</Label>
                  <Input
                    id="twilio_api_key"
                    value={formData.twilio_api_key}
                    onChange={(e) =>
                      setFormData({ ...formData, twilio_api_key: e.target.value })
                    }
                    placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    disabled={connecting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Twilio API Key (starts with SK)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilio_api_secret">Twilio API Secret</Label>
                  <Input
                    id="twilio_api_secret"
                    type="password"
                    value={formData.twilio_api_secret}
                    onChange={(e) =>
                      setFormData({ ...formData, twilio_api_secret: e.target.value })
                    }
                    placeholder="Your Twilio API Secret"
                    disabled={connecting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Twilio API Secret
                  </p>
                </div>

                <div className="pt-4">
                  <Button onClick={handleConnect} disabled={connecting} className="gap-2 w-full">
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarInset>
  );
}
