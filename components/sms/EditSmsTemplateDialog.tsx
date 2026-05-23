'use client';

import { useState, useEffect } from 'react';
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

interface SmsTemplate {
  _id?: string;
  template_id: string;
  template_name: string;
  message_body: string;
  trigger_condition?: string;
  is_active: boolean;
}

interface EditSmsTemplateDialogProps {
  open: boolean;
  template: SmsTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSmsTemplateDialog({
  open,
  template,
  onClose,
  onSuccess,
}: EditSmsTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setTemplateName(template.template_name);
      setMessageBody(template.message_body);
      setTriggerCondition(template.trigger_condition || '');
    }
  }, [template]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateName || !messageBody) {
      setError('Template Name and Message Body are required');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/sms/templates/${template.template_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            template_name: templateName,
            message_body: messageBody,
            trigger_condition: triggerCondition || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        handleClose();
        onSuccess();
      } else {
        setError(data.error || 'Failed to update template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit SMS Template</DialogTitle>
          <DialogDescription>
            Update template: {template.template_id}
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
              <Label htmlFor="template_id">Template ID</Label>
              <Input
                id="template_id"
                value={template.template_id}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Template ID cannot be changed after creation.
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
                Use {'{variable_name}'} for dynamic content.
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
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

