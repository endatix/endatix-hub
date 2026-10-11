import type { ReactNode } from "react";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StaticDataTableColumn = {
  key: string;
  label: string;
  className?: string;
};
export type StaticDataTableCell = {
  key: string;
  className?: string;
  content: ReactNode;
};

function HeadCell({ column }: Readonly<{ column: StaticDataTableColumn }>) {
  return (
    <TableHead
      className={dataTableHeaderCellClassName({
        isStatic: true,
        className: column.className,
      })}
    >
      <span className={dataTableColumnLabelClassName()}>{column.label}</span>
    </TableHead>
  );
}

function StaticDataTableCellView({
  cell,
  isEvenRow,
}: Readonly<{ cell: StaticDataTableCell; isEvenRow: boolean }>) {
  const className = dataTableBodyCellClassName({
    isEvenRow,
    className: cell.className,
  });
  return <TableCell className={className}>{cell.content}</TableCell>;
}

/** One body row with the shared zebra fill; parity is `index % 2 === 1` (DESIGN.md §5). */
export function StaticDataTableRow({
  index,
  cells,
}: Readonly<{ index: number; cells: StaticDataTableCell[] }>) {
  const isEvenRow = index % 2 === 1;
  return (
    <TableRow className={dataTableBodyRowClassName({ isEvenRow })}>
      {cells.map((cell) => (
        <StaticDataTableCellView
          key={cell.key}
          cell={cell}
          isEvenRow={isEvenRow}
        />
      ))}
    </TableRow>
  );
}

/** A table cell from a key, its content and an optional class. */
export const dataTableCell = (
  key: string,
  content: ReactNode,
  className?: string,
): StaticDataTableCell => ({ key, content, className });

function StaticDataTableHeader({
  columns,
}: Readonly<{ columns: readonly StaticDataTableColumn[] }>) {
  return (
    <TableHeader className="bg-surface-container-low">
      <TableRow className="border-0 hover:bg-transparent">
        {columns.map((column) => (
          <HeadCell key={column.key} column={column} />
        ))}
      </TableRow>
    </TableHeader>
  );
}

type StaticDataTableProps = {
  columns: readonly StaticDataTableColumn[];
  children: ReactNode;
};

/**
 * A hand-rolled list table on the shared chrome: static header row, rows as children
 * (`StaticDataTableRow`). For a few known rows; a sortable, filterable grid is `DataTableGrid`.
 */
export function StaticDataTable({
  columns,
  children,
}: Readonly<StaticDataTableProps>) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
        <StaticDataTableHeader columns={columns} />
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
