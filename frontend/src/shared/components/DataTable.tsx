// frontend/src/shared/components/DataTable.tsx
//
// Reused for: my leave, team queue, users, companies. Two rendering modes:
//   1. columns  — plain tabular cells, good for users / companies lists.
//   2. renderRow — a "list-row slot": you hand DataTable a row renderer
//      (e.g. LeaveRequestRow) and it wraps each item in a <tr>/<td> for you.
// Pass exactly one of columns or renderRow. DataTable never fetches — data
// always comes in as a prop.

import type { ReactNode } from "react";
import type { DataTableColumn } from "./types";
import { EmptyState } from "./EmptyState";

interface DataTableBaseProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  variant?: string;
}

interface DataTableColumnsProps<T> extends DataTableBaseProps<T> {
  columns: DataTableColumn<T>[];
  renderRow?: never;
}

interface DataTableRowSlotProps<T> extends DataTableBaseProps<T> {
  columns?: never;
  /** The list-row slot: render a full custom row for each item. */
  renderRow: (item: T) => ReactNode;
  /** Optional header row content when using the row slot. */
  headerRow?: ReactNode;
}

export type DataTableProps<T> =
  | DataTableColumnsProps<T>
  | DataTableRowSlotProps<T>;

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    keyExtractor,
    emptyTitle = "Nothing to show",
    emptyDescription,
    className,
    variant,
  } = props;

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
        variant={variant}
      />
    );
  }

  return (
    <table className={className} data-variant={variant}>
      {"columns" in props && props.columns ? (
        <>
          <thead>
            <tr>
              {props.columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>
                {props.columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </>
      ) : (
        <>
          {props.headerRow && <thead>{props.headerRow}</thead>}
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>{props.renderRow(item)}</tr>
            ))}
          </tbody>
        </>
      )}
    </table>
  );
}
