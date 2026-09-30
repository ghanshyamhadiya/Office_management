import { DataTableShell } from "@/components/layout/data-table-shell";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export function DataTable({
  columns,
  rows,
  empty
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  return (
    <DataTableShell emptyDescription={empty} emptyTitle="No data available" isEmpty={!rows.length}>
      <div className="overflow-x-auto">
        <Table>
          <THead>
            <TR>
              {columns.map((column) => (
                <TH key={column}>{column}</TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {rows.map((row, index) => (
              <TR key={index}>
                {row.map((cell, cellIndex) => (
                  <TD key={cellIndex}>{cell}</TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </DataTableShell>
  );
}
