'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, MessageSquare, ToggleLeft, ToggleRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CreateSmsTemplateDialog from "./CreateSmsTemplateDialog";
import EditSmsTemplateDialog from "./EditSmsTemplateDialog";

interface SmsTemplate {
  _id?: string;
  template_id: string;
  template_name: string;
  message_body: string;
  trigger_condition?: string;
  is_active: boolean;
  created_at: string;
}

export default function SmsTemplatesTab() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sms/templates');
      const data = await response.json();

      if (response.ok && data.success) {
        setTemplates(data.templates || []);
      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (template_id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sms/templates/${template_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchTemplates();
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleToggleStatus = async (template_id: string, currentStatus: boolean) => {
    // Optimistically update the UI
    setTemplates(prevTemplates =>
      prevTemplates.map(template =>
        template.template_id === template_id
          ? { ...template, is_active: !currentStatus }
          : template
      )
    );

    try {
      const response = await fetch(`/api/sms/templates/${template_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          is_active: !currentStatus,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update is already done optimistically, no need to refetch
        // Only refetch if there was an error to sync with server
      } else {
        // Revert on error
        setTemplates(prevTemplates =>
          prevTemplates.map(template =>
            template.template_id === template_id
              ? { ...template, is_active: currentStatus }
              : template
          )
        );
        alert(data.error || 'Failed to update template status');
      }
    } catch (err) {
      // Revert on error
      setTemplates(prevTemplates =>
        prevTemplates.map(template =>
          template.template_id === template_id
            ? { ...template, is_active: currentStatus }
            : template
        )
      );
      alert(err instanceof Error ? err.message : 'Failed to update template status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SMS Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage templates for follow-up messages
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
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
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Run <code className="bg-muted px-2 py-1 rounded text-xs">npm run seed-sms-templates</code> to create default templates, or create your own.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.template_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <CardDescription className="mt-1">
                      ID: {template.template_id}
                    </CardDescription>
                  </div>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm bg-muted p-2 rounded-md">
                      {template.message_body.length > 100
                        ? `${template.message_body.substring(0, 100)}...`
                        : template.message_body}
                    </p>
                  </div>
                  
                  {template.trigger_condition && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Trigger: {template.trigger_condition}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(template.template_id, template.is_active)}
                      className="gap-2"
                    >
                      {template.is_active ? (
                        <ToggleRight className="h-3 w-3" />
                      ) : (
                        <ToggleLeft className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.template_id)}
                      className="text-destructive hover:text-destructive gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSmsTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={fetchTemplates}
      />

      {editingTemplate && (
        <EditSmsTemplateDialog
          open={!!editingTemplate}
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            // Refresh templates after successful edit
            fetchTemplates();
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

