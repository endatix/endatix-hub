"use client";
import type { ColumnSizingState, RowData } from "@tanstack/react-table";
import type { Cell, Header, ReactTable, Row } from "./hub-table-features";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import {
  ColumnResizeHandle,
  resizedColumnStyle,
  resizedColumnWidth,
} from "./column-resize-handle";
import "./data-table-column-meta";
import { DataTablePendingRows } from "./data-table-skeleton-rows";
import { useHeldHeight } from "./use-held-height";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";

type DataTableGridProps<TData extends RowData> = {
  table: ReactTable<TData>;
  empty: ReactNode;
  hasRows: boolean;
  /**
   * The next page, filter, or sort is on its way: keep the header (and its
   * filters) mounted and show skeleton rows in place of the current ones.
   */
  isPending?: boolean;
  /**
   * Makes every row a click target, focusable and opened with Enter or Space.
   * Controls inside a cell that must not trigger it stop the click's
   * propagation; clicks from content portaled out of the row are ignored.
   */
  onRowClick?: (row: Row<TData>) => void;
};

/**
 * Shared TanStack header/body chrome used by Hub list surfaces. A table with
 * `enableColumnResizing: true` gets resize handles; a resized column keeps
 * its `columnSizing` width, the others stay automatic.
 *
 * Compiled by the React Compiler, which reuses a component's output while the
 * values it read keep their identity. TanStack rows, cells and headers keep
 * their identity while table state changes, but `table` is a new object on
 * every state change. So the header and the row list read state from it and
 * hand each row what it renders from: the visible cells, the column widths and
 * the pinned columns. Cell content renders again only for new rows or columns,
 * so a cell renderer must read row data, not other table state (selection,
 * sorting).
 */
export function DataTableGrid<TData extends RowData>({
  table,
  empty,
  hasRows,
  isPending = false,
  onRowClick,
}: Readonly<DataTableGridProps<TData>>) {
  const { ref, style } = useHeldHeight(isPending);

  if (!hasRows && !isPending) {
    return empty;
  }

  return (
    <div ref={ref} style={style} className="w-full overflow-x-auto">
      <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
        <GridHeader table={table} />
        <TableBody aria-busy={isPending || undefined}>
          {isPending ? (
            <DataTablePendingRows table={table} />
          ) : (
            <GridBodyRows table={table} onRowClick={onRowClick} />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const NO_SIZING: ColumnSizingState = {};
const NO_PINNED: string[] = [];

/** Column widths, on a table whose columns resize. */
function resizableSizing<TData extends RowData>(table: ReactTable<TData>) {
  return table.options.enableColumnResizing === true
    ? table.state.columnSizing
    : NO_SIZING;
}

function GridHeader<TData extends RowData>({
  table,
}: Readonly<{ table: ReactTable<TData> }>) {
  return (
    <TableHeader className="bg-surface-container-low">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="border-0 hover:bg-transparent"
        >
          {headerGroup.headers.map((header) =>
            headerCell(header, resizableSizing(table)),
          )}
        </TableRow>
      ))}
    </TableHeader>
  );
}

/**
 * Runs whenever the header does, so the content (sort state, header filters),
 * the pinning and the width are current.
 */
function headerCell<TData extends RowData>(
  header: Header<TData, unknown>,
  columnSizing: ColumnSizingState,
) {
  return (
    <GridHeaderCell
      key={header.id}
      header={header}
      isPinnedLeft={header.column.getIsPinned() === "start"}
      width={resizedColumnWidth(columnSizing, header.column)}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
    </GridHeaderCell>
  );
}

type GridHeaderCellProps<TData extends RowData> = {
  header: Header<TData, unknown>;
  isPinnedLeft: boolean;
  width: number | undefined;
  children: ReactNode;
};

function GridHeaderCell<TData extends RowData>({
  header,
  isPinnedLeft,
  width,
  children,
}: Readonly<GridHeaderCellProps<TData>>) {
  const className = header.column.columnDef.meta?.headerClassName;
  const isResizable = header.getContext().table.options.enableColumnResizing;
  return (
    <TableHead
      colSpan={header.colSpan}
      className={dataTableHeaderCellClassName({ isPinnedLeft, className })}
      style={resizedColumnStyle(width)}
    >
      {children}
      {isResizable === true && <ColumnResizeHandle header={header} />}
    </TableHead>
  );
}

type GridBodyRowsProps<TData extends RowData> = Pick<
  DataTableGridProps<TData>,
  "table" | "onRowClick"
>;

function GridBodyRows<TData extends RowData>(
  props: Readonly<GridBodyRowsProps<TData>>,
) {
  const { table, onRowClick } = props;
  const sizing = resizableSizing(table);
  const pinnedStart = table.state.columnPinning.start ?? NO_PINNED;
  return table
    .getRowModel()
    .rows.map((row, rowIndex) => (
      <GridBodyRow
        key={row.id}
        row={row}
        cells={row.getVisibleCells()}
        isEvenRow={rowIndex % 2 === 1}
        sizing={sizing}
        pinnedStart={pinnedStart}
        onRowClick={onRowClick}
      />
    ));
}

type GridBodyRowProps<TData extends RowData> = {
  row: Row<TData>;
  cells: Cell<TData, unknown>[];
  isEvenRow: boolean;
  sizing: ColumnSizingState;
  pinnedStart: readonly string[];
  onRowClick?: (row: Row<TData>) => void;
};

/**
 * Compiled: returns its previous output while its row, visible cells, widths
 * and pinning keep their identity, so React leaves the row's cells alone.
 */
function GridBodyRow<TData extends RowData>(
  props: Readonly<GridBodyRowProps<TData>>,
) {
  const { row, cells, isEvenRow, sizing, pinnedStart, onRowClick } = props;
  const className = onRowClick ? "cursor-pointer" : undefined;
  return (
    <TableRow
      className={dataTableBodyRowClassName({ isEvenRow, className })}
      {...(onRowClick && rowActivationProps(row, onRowClick))}
    >
      {cells.map((cell) => bodyCell(cell, { isEvenRow, sizing, pinnedStart }))}
    </TableRow>
  );
}

function bodyCell<TData extends RowData>(
  cell: Cell<TData, unknown>,
  {
    isEvenRow,
    sizing,
    pinnedStart,
  }: Pick<GridBodyRowProps<TData>, "isEvenRow" | "sizing" | "pinnedStart">,
) {
  return (
    <GridBodyCell
      key={cell.id}
      cell={cell}
      isEvenRow={isEvenRow}
      isPinnedLeft={pinnedStart.includes(cell.column.id)}
      width={resizedColumnWidth(sizing, cell.column)}
    />
  );
}

function rowActivationProps<TData extends RowData>(
  row: Row<TData>,
  onRowClick: (row: Row<TData>) => void,
) {
  return {
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLTableRowElement>) => {
      if (event.currentTarget.contains(event.target as Node)) {
        onRowClick(row);
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (isRowActivationKey(event)) {
        event.preventDefault();
        onRowClick(row);
      }
    },
  };
}

/** Enter or Space on the row itself, not on a control or dialog inside it. */
function isRowActivationKey(event: KeyboardEvent<HTMLTableRowElement>) {
  return (
    event.target === event.currentTarget &&
    (event.key === "Enter" || event.key === " ")
  );
}

type GridBodyCellProps<TData extends RowData> = {
  cell: Cell<TData, unknown>;
  isEvenRow: boolean;
  isPinnedLeft: boolean;
  width: number | undefined;
};

/** A width or pinning change re-renders the cell, not what it shows. */
function GridBodyCell<TData extends RowData>({
  cell,
  isEvenRow,
  isPinnedLeft,
  width,
}: Readonly<GridBodyCellProps<TData>>) {
  return (
    <TableCell
      className={dataTableBodyCellClassName({
        isPinnedLeft,
        isEvenRow,
        className: cell.column.columnDef.meta?.cellClassName,
      })}
      style={resizedColumnStyle(width)}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}
