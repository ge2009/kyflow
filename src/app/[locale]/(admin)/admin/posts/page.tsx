import { Header, Main, MainHeader } from "@/blocks/dashboard";
import { TableCard } from "@/blocks/table";

export default async function PostsPage() {
  return (
    <>
      <Header />
      <Main>
        <MainHeader title="Posts" />
        <TableCard table={{ columns: [], data: [] }} />
      </Main>
    </>
  );
}
