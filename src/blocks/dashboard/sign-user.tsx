"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { Link } from "@/core/i18n/navigation";
import { signOut, useSession } from "@/core/auth/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Fragment } from "react";
import { NavItem, Nav as NavType } from "@/types/blocks/base";

export function SignUser({ nav }: { nav: NavType }) {
  const { data: session, isPending } = useSession();
  const { isMobile, open } = useSidebar();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <>
      {session?.user ? (
        <SidebarMenu className="gap-4">
          {!open && (
            <SidebarMenuItem>
              <SidebarMenuButton className="cursor-pointer" asChild>
                <SidebarTrigger />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar
                    className={`rounded-lg ${open ? "h-8 w-8" : "h-8 w-8"}`}
                  >
                    <AvatarImage
                      src={session?.user?.image || ""}
                      alt={session?.user?.name}
                    />
                    <AvatarFallback className="rounded-lg">
                      {session?.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.name}
                    </span>
                    <span className="truncate text-xs">
                      {/* {session?.user?.email} */}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-background"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={session?.user?.image || ""}
                        alt={session?.user?.name}
                      />
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.name}
                      </span>
                      <span className="truncate text-xs">
                        {/* {session?.user?.email} */}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {nav.items.map((item: NavItem | undefined) => (
                    <Fragment key={item?.name || item?.title}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Link
                          href={item?.url || ""}
                          target={item?.target}
                          className="w-full flex items-center gap-2"
                        >
                          {item?.icon && item?.icon}
                          {item?.title || ""}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </Fragment>
                  ))}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <>
          {open ? (
            <div className="flex justify-center items-center h-full px-4 py-4">
              <Button className="w-full" onClick={() => {}}>
                Sign in
              </Button>
            </div>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="cursor-pointer" asChild>
                  <SidebarTrigger />
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  className="cursor-pointer"
                    onClick={() => {}}
                  asChild
                >
                  <User />
                </SidebarMenuButton>
              </SidebarMenuItem> */}
            </SidebarMenu>
          )}
        </>
      )}
    </>
  );
}
