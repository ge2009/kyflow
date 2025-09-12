import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type Dashboard as DashboardType } from "@/types/blocks/dashboard";
import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function DashboardLayout({
  children,
  dashboard,
}: {
  children: ReactNode;
  dashboard: DashboardType;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {dashboard.sidebar && (
        <Sidebar
          variant={dashboard.sidebar.variant || "inset"}
          sidebar={dashboard.sidebar}
        />
      )}
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
