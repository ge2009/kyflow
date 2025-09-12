"use client";

import * as React from "react";
import { IconInnerShadowTop } from "@tabler/icons-react";

import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link } from "@/core/i18n/navigation";
import { type Sidebar as SidebarType } from "@/types/blocks/dashboard";
import { Nav } from "./nav";
import { SignUser } from "./sign-user";
import { SidebarHeader } from "./sidebar-header";

export function Sidebar({
  sidebar,
  ...props
}: React.ComponentProps<typeof SidebarComponent> & {
  sidebar: SidebarType;
}) {
  return (
    <SidebarComponent collapsible="offcanvas" {...props}>
      {sidebar.brand && <SidebarHeader brand={sidebar.brand} />}
      <SidebarContent>
        {sidebar.navs &&
          sidebar.navs.map((nav, idx) => <Nav key={idx} nav={nav} />)}
        {sidebar.bottom_nav && (
          <Nav nav={sidebar.bottom_nav} className="mt-auto" />
        )}
        {/* {data.main_nav && <SidebarNav data={data.main_nav} />}
        {data.bottom_nav && (
          <SidebarNav data={data.bottom_nav} className="mt-auto" />
        )} */}
        {/* <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <SignUser nav={sidebar.bottom_nav || { items: [] }} />
      </SidebarFooter>
    </SidebarComponent>
  );
}
