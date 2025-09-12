import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader as SidebarHeaderComponent,
} from "@/components/ui/sidebar";
import { Link } from "@/core/i18n/navigation";
import Image from "next/image";
import { Brand } from "@/types/blocks/base";

export function SidebarHeader({ brand }: { brand: Brand }) {
  return (
    <SidebarHeaderComponent className="mb-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className="data-[slot=sidebar-menu-button]:!p-1.5"
          >
            {brand && (
              <Link href={brand.url as string}>
                {brand.logo && (
                  <Image
                    src={brand.logo.src}
                    alt={brand.logo.alt || ""}
                    width={100}
                    height={100}
                    className="h-10 w-auto"
                  />
                )}
                <span className="text-base font-semibold">{brand.title}</span>
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeaderComponent>
  );
}
