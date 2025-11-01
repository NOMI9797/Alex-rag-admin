'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

const agents = [
  {
    name: "AI Voice Agent",
    logo: Bot,
    plan: "Production",
  },
  {
    name: "Test Agent",
    logo: Bot,
    plan: "Development",
  },
];

export function SidebarNavHeader() {
  const [activeAgent, setActiveAgent] = useState(agents[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <activeAgent.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeAgent.name}
                </span>
                <span className="truncate text-xs">{activeAgent.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Agents
            </DropdownMenuLabel>
            {agents.map((agent, index) => (
              <DropdownMenuItem
                key={agent.name}
                className="gap-2 p-2"
                onClick={() => setActiveAgent(agent)}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <agent.logo className="size-4 shrink-0" />
                </div>
                {agent.name}
                <span className="ml-auto text-xs">⌘{index + 1}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add agent
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

