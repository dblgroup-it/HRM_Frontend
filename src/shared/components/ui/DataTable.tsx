import type { ReactNode } from 'react';

import { cn } from '@shared/lib';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  /** Stable key, also used for React keys. */
  key: string;
  header: ReactNode;
  /** Render the cell for a given row. */
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

const alignment = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner label="Loading records…" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
                  alignment[column.align ?? 'left']
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-slate-100 transition-colors last:border-0',
                onRowClick && 'cursor-pointer hover:bg-slate-50'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-slate-700',
                    alignment[column.align ?? 'left'],
                    column.className
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
