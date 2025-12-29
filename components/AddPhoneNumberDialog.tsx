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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AddPhoneNumberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'credentials' | 'phone' | 'configuring' | 'dispatch' | 'success';

export default function AddPhoneNumberDialog({
  open,
  onClose,
  onSuccess,
}: AddPhoneNumberDialogProps) {
  const [step, setStep] = useState<Step>('credentials');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    // Reset state
    setStep('credentials');
    setAccountSid('');
    setAuthToken('');
    setPhoneNumber('');
    setPhoneNumberId('');
    setError(null);
    onClose();
  };

  const validateCredentials = async () => {
    try {
      setValidating(true);
      setError(null);

      const response = await fetch('/api/twilio/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('phone');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate credentials');
    } finally {
      setValidating(false);
    }
  };

  const configureSIPTrunk = async () => {
    try {
      setError(null);
      setStep('configuring');

      // 1. Configure Twilio SIP trunk
      const configResponse = await fetch('/api/twilio/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken, phoneNumber }),
      });

      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.success) {
        setError(configData.error || 'Failed to configure SIP trunk');
        setStep('phone');
        return;
      }

      setPhoneNumberId(configData.phoneNumber.id);
      setStep('dispatch');

      // 2. Create LiveKit dispatch rule
      const dispatchResponse = await fetch('/api/livekit/dispatch-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: configData.phoneNumber.id,
          metadata: {
            org_name: 'Organization', // TODO: Get from context
          },
        }),
      });

      const dispatchData = await dispatchResponse.json();

      if (!dispatchResponse.ok || !dispatchData.success) {
        setError(dispatchData.error || 'Failed to create dispatch rule');
        setStep('phone');
        return;
      }

      // Success!
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure phone number');
      setStep('phone');
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'credentials':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Connect Twilio Account</DialogTitle>
              <DialogDescription>
                Enter your Twilio credentials to get started
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  placeholder="AC..."
                  disabled={validating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Your auth token"
                  disabled={validating}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Find your credentials in the{' '}
                <a
                  href="https://console.twilio.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Twilio Console
                </a>
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={validating}>
                Cancel
              </Button>
              <Button
                onClick={validateCredentials}
                disabled={!accountSid || !authToken || validating}
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </DialogFooter>
          </>
        );

      case 'phone':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Enter Phone Number</DialogTitle>
              <DialogDescription>
                Enter the Twilio phone number you want to connect
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Enter in E.164 format (e.g., +1234567890)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('credentials')}>
                Back
              </Button>
              <Button onClick={configureSIPTrunk} disabled={!phoneNumber}>
                Connect
              </Button>
            </DialogFooter>
          </>
        );

      case 'configuring':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Configuring...</DialogTitle>
              <DialogDescription>
                Setting up SIP trunk in your Twilio account
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                This may take a few moments...
              </p>
            </div>
          </>
        );

      case 'dispatch':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Creating Dispatch Rule...</DialogTitle>
              <DialogDescription>
                Connecting to LiveKit SIP infrastructure
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Almost done...
              </p>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Success!</DialogTitle>
              <DialogDescription>
                Phone number connected successfully
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold mb-2">{phoneNumber}</p>
              <p className="text-sm text-muted-foreground text-center">
                Your phone number is now ready to receive calls!
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => {
                handleClose();
                onSuccess();
              }}>
                Done
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

