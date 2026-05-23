'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Phone, CheckCircle2, AlertCircle } from "lucide-react";

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function SettingsPage() {
  const [operatorPhone, setOperatorPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent-settings');
      const data = await res.json();
      if (data.success && data.operator_phone) {
        setOperatorPhone(data.operator_phone);
        setSavedPhone(data.operator_phone);
      }
    } catch {
      // leave fields empty — user can set for the first time
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch('/api/agent-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_phone: operatorPhone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedPhone(data.operator_phone);
        setMessage({ type: 'success', text: 'Operator number saved.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = operatorPhone.trim() !== savedPhone;

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure global agent behaviour for your organisation
          </p>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Operator Number
            </CardTitle>
            <CardDescription>
              The number the agent dials when it needs to transfer a call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="operator-phone">Phone number (E.164 format)</Label>
                  <Input
                    id="operator-phone"
                    type="tel"
                    placeholder="+15034448659"
                    value={operatorPhone}
                    onChange={(e) => {
                      setOperatorPhone(e.target.value);
                      setMessage(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must start with + followed by country code and number (e.g. +15034448659)
                  </p>
                </div>

                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    {message.type === 'success'
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleSave} disabled={saving || !hasChanges || !operatorPhone.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
