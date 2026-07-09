'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Loader2, Save, Phone, CheckCircle2, AlertCircle, Bell, MessageCircle, Mail, Check } from "lucide-react";

type NotificationChannel = 'telegram' | 'email' | 'both';

interface Message {
  type: 'success' | 'error';
  text: string;
}

const CHANNEL_OPTIONS: {
  value: NotificationChannel;
  label: string;
  description: string;
  icon: typeof MessageCircle;
}[] = [
  {
    value: 'both',
    label: 'Both Telegram & Email',
    description: 'Operator gets notified on both channels (recommended).',
    icon: Bell,
  },
  {
    value: 'telegram',
    label: 'Telegram only',
    description: 'Operator alerts go to Telegram. Email is skipped.',
    icon: MessageCircle,
  },
  {
    value: 'email',
    label: 'Email only',
    description: 'Operator alerts go to email. Telegram is skipped.',
    icon: Mail,
  },
];

export default function SettingsPage() {
  const [operatorPhone, setOperatorPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [channels, setChannels] = useState<NotificationChannel>('both');
  const [savedChannels, setSavedChannels] = useState<NotificationChannel>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [channelMessage, setChannelMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent-settings');
      const data = await res.json();
      if (data.success) {
        if (data.operator_phone) {
          setOperatorPhone(data.operator_phone);
          setSavedPhone(data.operator_phone);
        }
        if (data.notification_channels) {
          setChannels(data.notification_channels);
          setSavedChannels(data.notification_channels);
        }
      }
    } catch {
      // leave fields at defaults — user can set for the first time
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

  const handleSaveChannels = async () => {
    setChannelMessage(null);
    setSavingChannels(true);
    try {
      const res = await fetch('/api/agent-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_channels: channels }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedChannels(data.notification_channels);
        setChannelMessage({ type: 'success', text: 'Notification preference saved. Takes effect on the next call.' });
      } else {
        setChannelMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setChannelMessage({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSavingChannels(false);
    }
  };

  const hasChanges = operatorPhone.trim() !== savedPhone;
  const hasChannelChanges = channels !== savedChannels;

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

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Operator Notifications
            </CardTitle>
            <CardDescription>
              Choose how the agent notifies you about operator alerts (transfers, missed calls, etc.).
              Customer SMS is unaffected.
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
                <div className="space-y-2" role="radiogroup" aria-label="Notification channels">
                  {CHANNEL_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = channels === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setChannels(opt.value);
                          setChannelMessage(null);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-primary bg-accent/40" : "border-border"
                        )}
                      >
                        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.description}</div>
                        </div>
                        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {channelMessage && (
                  <Alert variant={channelMessage.type === 'error' ? 'destructive' : 'default'}>
                    {channelMessage.type === 'success'
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{channelMessage.text}</AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleSaveChannels} disabled={savingChannels || !hasChannelChanges}>
                  {savingChannels ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save preference
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
