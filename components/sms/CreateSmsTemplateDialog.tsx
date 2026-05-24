'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface CreateSmsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSmsTemplateDialog({
  open,
  onClose,
  onSuccess,
}: CreateSmsTemplateDialogProps) {
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setTemplateId('');
    setTemplateName('');
    setMessageBody('');
    setTriggerCondition('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateId || !templateName || !messageBody) {
      setError('Template ID, Name, and Message Body are required');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          template_name: templateName,
          message_body: messageBody,
          trigger_condition: triggerCondition || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        handleClose();
        onSuccess();
      } else {
        setError(data.error || 'Failed to create template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create SMS Template</DialogTitle>
          <DialogDescription>
            Create a new template for follow-up messages. Use variables like {'{customer_name}'}, {'{order_id}'}, etc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="template_id">Template ID *</Label>
              <Input
                id="template_id"
                placeholder="e.g., order_confirmed"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, underscores only). Used by agent to select this template.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                placeholder="e.g., Order Confirmation"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message_body">Message Body *</Label>
              <Textarea
                id="message_body"
                placeholder="Hi {customer_name}, your order #{order_id} is confirmed. Link: {booking_link}"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use {'{variable_name}'} for dynamic content. Agent will replace these with actual values.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger_condition">Trigger Condition (Optional)</Label>
              <Input
                id="trigger_condition"
                placeholder="e.g., order_confirmed, appointment_scheduled"
                value={triggerCondition}
                onChange={(e) => setTriggerCondition(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional condition identifier for agent to match this template.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

