/**
 * Usage: <DataTable data={rows} keyExtractor={(row) => row.id} columns={columns} />
 */
import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

type DataTableBaseProps<T> = {
  data: T[]
  keyExtractor: (item: T) => string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

type DataTableColumnsProps<T> = DataTableBaseProps<T> & {
  columns: DataTableColumn<T>[]
  renderRow?: never
  headerRow?: never
}

type DataTableRowSlotProps<T> = DataTableBaseProps<T> & {
  columns?: never
  renderRow: (item: T) => ReactNode
  headerRow?: ReactNode
}

export type DataTableProps<T> =
  | DataTableColumnsProps<T>
  | DataTableRowSlotProps<T>

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    keyExtractor,
    emptyTitle = 'Nothing to show',
    emptyDescription,
    className = '',
  } = props
  const classes = ['data-table', className].filter(Boolean).join(' ')

  if (data.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    )
  }

  if (props.columns) {
    return (
      <table className={classes}>
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
      </table>
    )
  }

  return (
    <table className={classes}>
      {props.headerRow ? <thead>{props.headerRow}</thead> : null}
      <tbody>
        {data.map((item) => (
          <tr key={keyExtractor(item)}>{props.renderRow(item)}</tr>
        ))}
      </tbody>
    </table>
  )
}
