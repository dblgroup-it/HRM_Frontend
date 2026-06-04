import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@shared/lib';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PageButton>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <PageButton
            key={p}
            active={p === page}
            onClick={() => onPageChange(p)}
          >
            {p}
          </PageButton>
        ))}
        <PageButton
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-brand-600 text-white'
          : 'text-slate-600 hover:bg-slate-100',
        className
      )}
      {...props}
    />
  );
}
