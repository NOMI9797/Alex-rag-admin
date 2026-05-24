'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SmsMessage {
  _id: string;
  to_number: string;
  from_number: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sent_at: string;
  template_id?: string;
  related_call_id?: string;
}

export default function SmsMessagesTab() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sms/messages?limit=50');
      const data = await response.json();

      if (response.ok && data.success) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Refresh every 30 seconds to see new messages
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      sent: { variant: 'default', label: 'Sent' },
      delivered: { variant: 'default', label: 'Delivered' },
      queued: { variant: 'secondary', label: 'Queued' },
      failed: { variant: 'destructive', label: 'Failed' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">SMS Messages</h3>
        <p className="text-sm text-muted-foreground">
          View messages sent by the agent after calls
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-sm text-muted-foreground">
                Messages sent by the agent will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{message.to_number}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {message.from_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(message.status)}
                    {message.direction === 'outbound' && (
                      <Badge variant="outline">Outbound</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{message.message_body}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Sent: {new Date(message.sent_at).toLocaleString()}
                    </span>
                    {message.template_id && (
                      <span>Template: {message.template_id}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

