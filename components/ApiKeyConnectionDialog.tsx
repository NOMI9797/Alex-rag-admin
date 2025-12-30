'use client';

import { useState } from 'react';
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
import { Loader2, CheckCircle2, AlertCircle, Phone } from "lucide-react";

interface ApiKeyConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApiKeyConnectionDialog({
  open,
  onClose,
  onSuccess,
}: ApiKeyConnectionDialogProps) {
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
          handleClose();
          onSuccess();
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

  const handleClose = () => {
    // Reset state
    setFormData({
      phone_number: '',
      twilio_account_sid: '',
      twilio_api_key: '',
      twilio_api_secret: '',
    });
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect with API Key</DialogTitle>
          <DialogDescription>
            Enter your phone number and Twilio API credentials
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Phone number connected successfully!</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder="+1234567890"
              disabled={connecting || success}
            />
            <p className="text-xs text-muted-foreground">
              Enter phone number in E.164 format (e.g., +1234567890)
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
              disabled={connecting || success}
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
              disabled={connecting || success}
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
              disabled={connecting || success}
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio API Secret
            </p>
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={connecting || success}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConnect} 
              disabled={connecting || success} 
              className="gap-2 flex-1"
            >
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
      </DialogContent>
    </Dialog>
  );
}



