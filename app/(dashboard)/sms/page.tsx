'use client';

import { Header } from "@/components/layout/header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SmsTemplatesTab from "@/components/sms/SmsTemplatesTab";
import SmsMessagesTab from "@/components/sms/SmsMessagesTab";

export default function SmsPage() {
  return (
    <SidebarInset>
      <Header />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage SMS templates and view messages sent by the agent
          </p>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
          <TabsContent value="templates">
            <SmsTemplatesTab />
          </TabsContent>
          <TabsContent value="messages">
            <SmsMessagesTab />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}

