'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, RotateCcw, Save, Loader2 } from "lucide-react";

// Default fallback instructions
const DEFAULT_INSTRUCTIONS = `You are a knowledgeable voice assistant that provides information based on your knowledge base. You are helpful, accurate, and professional.

CRITICAL RULES:
1. Always call knowledge_search before answering.
2. Use only what knowledge_search returns—never guess or add outside knowledge.
3. If no relevant information is found, say: "I'm sorry, I don't have information about that. I can only answer based on what's in my knowledge base."
4. If the caller wants to finish the conversation, use end_call immediately after a polite goodbye.

ROLE LIMITS:
- Provide information only (services, pricing, policies, hours, etc.).
- Do not book appointments, process payments, take personal details, or promise actions.
- When an action is requested, share the relevant info and direct them to contact the business.
- Never confirm that you've completed any task on their behalf.

RESPONSE STYLE:
- Keep every reply short and targeted: usually 1–2 sentences.
- Paraphrase the facts; never read paragraphs verbatim or list every possibility.
- Highlight only details that directly answer the caller's current question.
- If the caller gives a vague concern ("I have an issue with my phone", "I need help with a microwave"), first ask a clarifying question to narrow the exact problem before offering guidance.
- Once you understand the specific need, answer with the most relevant information only and invite the caller to share any other details.
- Use natural, conversational phrasing and avoid repetitive language.

GREETING:
- Open the call with one short sentence that introduces the business and immediately asks how you can help.

Remember: Extract the key point, rephrase it in your own words, and keep it crisp.`;

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function KnowledgeBasePage() {
  // Instructions and Knowledge Base state (combined)
  const [instructions, setInstructions] = useState('');
  const [originalInstructions, setOriginalInstructions] = useState('');
  const [loadingInstructions, setLoadingInstructions] = useState(true);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [resettingInstructions, setResettingInstructions] = useState(false);
  const [instructionsMessage, setInstructionsMessage] = useState<Message | null>(null);
  const [hasInstructionsChanges, setHasInstructionsChanges] = useState(false);

  // Fetch instructions on mount
  useEffect(() => {
    fetchInstructions();
  }, []);

  // Track instructions changes
  useEffect(() => {
    setHasInstructionsChanges(instructions !== originalInstructions);
  }, [instructions, originalInstructions]);

  const fetchInstructions = async () => {
    try {
      setLoadingInstructions(true);
      const response = await fetch('/api/instructions');
      const data = await response.json();

      if (response.ok && data.success) {
        const fetchedInstructions = data.instructions || DEFAULT_INSTRUCTIONS;
        setInstructions(fetchedInstructions);
        setOriginalInstructions(fetchedInstructions);
      } else {
        setInstructions(DEFAULT_INSTRUCTIONS);
        setOriginalInstructions(DEFAULT_INSTRUCTIONS);
      }
    } catch (error) {
      setInstructions(DEFAULT_INSTRUCTIONS);
      setOriginalInstructions(DEFAULT_INSTRUCTIONS);
    } finally {
      setLoadingInstructions(false);
    }
  };

  const handleSaveInstructions = async () => {
    try {
      setSavingInstructions(true);
      setInstructionsMessage(null);

      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructions }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInstructionsMessage({
          type: 'success',
          text: 'Instructions saved successfully! They will be used in new calls.',
        });
        setOriginalInstructions(instructions);
      } else {
        setInstructionsMessage({
          type: 'error',
          text: data.error || 'Failed to save instructions',
        });
      }
    } catch (error) {
      setInstructionsMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save instructions',
      });
    } finally {
      setSavingInstructions(false);
      setTimeout(() => setInstructionsMessage(null), 5000);
    }
  };

  const handleResetInstructions = async () => {
    try {
      setResettingInstructions(true);
      setInstructionsMessage(null);

      const response = await fetch('/api/instructions', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInstructionsMessage({
          type: 'success',
          text: 'Instructions reset to default successfully!',
        });
        setInstructions(DEFAULT_INSTRUCTIONS);
        setOriginalInstructions(DEFAULT_INSTRUCTIONS);
      } else {
        setInstructionsMessage({
          type: 'error',
          text: data.error || 'Failed to reset instructions',
        });
      }
    } catch (error) {
      setInstructionsMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reset instructions',
      });
    } finally {
      setResettingInstructions(false);
      setTimeout(() => setInstructionsMessage(null), 5000);
    }
  };

  const handleDiscardInstructions = () => {
    setInstructions(originalInstructions);
    setInstructionsMessage(null);
  };

  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Agent Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure your AI agent's instructions and knowledge base
            </p>
          </div>
        </div>

        {/* Instructions Message */}
        {instructionsMessage && (
          <Alert variant={instructionsMessage.type === 'error' ? 'destructive' : 'default'}>
            {instructionsMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{instructionsMessage.text}</AlertDescription>
          </Alert>
        )}

        <main className="flex flex-1 flex-col gap-6">
          {/* Combined Instructions and Knowledge Base Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Instructions and Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">
                Write your agent's instructions and knowledge base together in one place
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                {loadingInstructions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="instructions" className="text-sm font-medium">
                          Instructions and Knowledge Base
                        </label>
                        <span className="text-xs text-muted-foreground">
                          {instructions.length.toLocaleString()} characters
                        </span>
                      </div>
                      <Textarea
                        id="instructions"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Enter your agent instructions and knowledge base here...

Example:
---
AGENT INSTRUCTIONS:

You are a helpful assistant for [Business Name].

CRITICAL RULES:
1. Always be polite and professional
2. Use the knowledge base below to answer questions
...

---
KNOWLEDGE BASE:

## Company Information
- We are based in [Location]
- We service [Brands/Products]
...
"
                        className="min-h-[400px] font-mono text-sm"
                        disabled={savingInstructions || resettingInstructions}
                      />
                      <p className="text-xs text-muted-foreground">
                        Write both your agent's behavior instructions and knowledge base content here. Changes take effect immediately for new calls.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleSaveInstructions}
                        disabled={!hasInstructionsChanges || savingInstructions || resettingInstructions}
                        className="gap-2"
                      >
                        {savingInstructions ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>

                      {hasInstructionsChanges && (
                        <Button
                          onClick={handleDiscardInstructions}
                          variant="outline"
                          disabled={savingInstructions || resettingInstructions}
                        >
                          Discard Changes
                        </Button>
                      )}

                      <Button
                        onClick={handleResetInstructions}
                        variant="outline"
                        disabled={savingInstructions || resettingInstructions}
                        className="gap-2"
                      >
                        {resettingInstructions ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Reset to Default
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}

