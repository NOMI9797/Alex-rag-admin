'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Database, Activity, Clock, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            AI Agent Dashboard
          </h2>
        </div>
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Knowledge Base Vectors
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Total vectors stored
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Agent Status
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Active</div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Last Updated
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Knowledge base timestamp
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Collection Status
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Ready</div>
                <p className="text-xs text-muted-foreground">
                  Qdrant connected
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 font-semibold">1. Upload Knowledge Base</h3>
                    <p className="text-sm text-muted-foreground">
                      Navigate to the Knowledge Base page to upload your documents (.txt, .pdf, .docx, .md)
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 font-semibold">2. Agent Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Your agent will automatically load the knowledge base from Qdrant
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 font-semibold">3. Monitor Performance</h3>
                    <p className="text-sm text-muted-foreground">
                      Track agent responses and knowledge base usage in real-time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vector Database</span>
                  <span className="text-sm font-medium">Qdrant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Embeddings Model</span>
                  <span className="text-sm font-medium">text-embedding-3-small</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dimensions</span>
                  <span className="text-sm font-medium">1536</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agent Framework</span>
                  <span className="text-sm font-medium">LiveKit</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
