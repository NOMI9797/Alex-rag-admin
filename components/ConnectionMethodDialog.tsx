'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Shield } from "lucide-react";

interface ConnectionMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'auth_token' | 'api_key') => void;
}

export default function ConnectionMethodDialog({
  open,
  onClose,
  onSelectMethod,
}: ConnectionMethodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choose Connection Method</DialogTitle>
          <DialogDescription>
            Select how you want to connect your Twilio phone number
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelectMethod('auth_token')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Auth Token</CardTitle>
                  <CardDescription>Use Account SID and Auth Token</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect using your Twilio Account SID and Auth Token. This method is simpler and requires fewer credentials.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button className="w-full">
                  Select Auth Token
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelectMethod('api_key')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">API Key</CardTitle>
                  <CardDescription>Use Account SID, API Key, and API Secret</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect using Twilio API credentials. This method provides more granular control and is recommended for production environments.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button className="w-full">
                  Select API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}



