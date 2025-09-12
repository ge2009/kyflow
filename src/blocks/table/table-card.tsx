import { Table as TableType } from "@/types/blocks/table";
import { Table } from "@/blocks/table";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/blocks/base/pagination";

export function TableCard({ table }: { table: TableType }) {
  return (
    <Card className="p-4">
      <Table {...table} />
      <div className="">
        <div className="flex-1"></div>
        {table.pagination && (
          <Pagination
            total={table.pagination.total}
            limit={table.pagination.limit}
            page={table.pagination.page}
            className="justify-end pb-4"
          />
        )}
      </div>
    </Card>
  );
}
