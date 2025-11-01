'use client';

import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure your agent settings and preferences
            </p>
          </div>
        </div>

        <main className="flex flex-1 flex-col gap-4 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Settings page will be available in a future update
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This page will allow you to configure agent settings, API keys, and other preferences.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarInset>
  );
}

