import { ReactNode } from "react";
import { DashboardLayout } from "@/blocks/dashboard/layout";
import { getAdminData } from "@/services/locale";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const data = await getAdminData("admin");

  return <DashboardLayout dashboard={data}>{children}</DashboardLayout>;
}
