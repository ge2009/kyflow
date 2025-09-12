import { Header, Main, MainHeader } from "@/blocks/dashboard";
import { TableCard } from "@/blocks/table";
import { type Table } from "@/types/blocks/table";
import { Button } from "@/types/blocks/base";
import { getCategories, getCategoriesCount } from "@/services/taxonomy";
import { Pagination } from "@/blocks/base/pagination";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string }>;
}) {
  const { page: queryPage } = await searchParams;
  const page = parseInt(queryPage) || 1;
  const limit = 2;

  const data = await getCategories({
    page,
    limit,
  });
  const total = await getCategoriesCount();

  const table: Table = {
    columns: [
      { name: "title", title: "Title" },
      { name: "slug", title: "Slug", type: "copy" },
      { name: "status", title: "Status", type: "label" },
      { name: "createdAt", title: "Created At", type: "time" },
      { name: "updatedAt", title: "Updated At", type: "time" },
    ],
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [
    {
      name: "add",
      text: "Add Category",
      icon: "RiAddLine",
      url: "/admin/categories/add",
    },
  ];

  return (
    <>
      <Header />
      <Main>
        <MainHeader title="Categories" actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
