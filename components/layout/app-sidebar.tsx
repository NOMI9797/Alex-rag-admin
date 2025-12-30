'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Database, Home, HelpCircle, Send, Phone, FileText, Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNavHeader } from "./sidebar-nav-header";
import { SidebarNavFooter } from "./sidebar-nav-footer";

const navMenu = [
  {
    heading: "Admin Dashboard",
    items: [
      {
        title: "Dashboard",
        icon: Home,
        link: "/",
      },
      {
        title: "Phone Numbers",
        icon: Phone,
        link: "/phone-numbers",
      },
      {
        title: "Knowledge Base",
        icon: Database,
        link: "/knowledge-base-new",
      },
      {
        title: "Agent Instructions",
        icon: Bot,
        link: "/knowledge-base",
      },
    ],
  },
];

const navMenuBottom = [
  {
    title: "Help & Support",
    icon: HelpCircle,
    link: "#",
  },
  {
    title: "Feedback",
    icon: Send,
    link: "#",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" side="left" variant="sidebar">
      <SidebarHeader>
        <SidebarNavHeader />
      </SidebarHeader>
      <SidebarContent>
        {navMenu.map((nav, indexGroup) => (
          <SidebarGroup key={indexGroup}>
            {nav.heading && (
              <SidebarGroupLabel>{nav.heading}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {nav.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.link;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.link}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            {navMenuBottom.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm">
                    <Link href={item.link}>
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarNavFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

