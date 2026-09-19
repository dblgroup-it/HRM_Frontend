import { useRef } from 'react';
import { ExternalLink, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { useTestSheet } from '../hooks/useAssessment';

const ACCEPT = '.pdf,application/pdf';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The marked answer script for a hand-marked screening test.
 *
 * Optional by design: these tests have always been markable without one, and
 * an interviewer at a factory with no scanner must not be blocked from
 * recording a mark. When it is attached, Corporate HR and the recruiter open
 * it beside the mark instead of taking the number on trust.
 *
 * `canEdit` is false for a reader — the link stays, the buttons do not.
 */
export function ExamSheetControl({
  candidateId,
  kind,
  sheetUrl,
  canEdit,
  className,
}: {
  candidateId: string;
  kind: 'written' | 'computer';
  sheetUrl: string | null;
  canEdit: boolean;
  className?: string;
}) {
  const { upload, remove } = useTestSheet(candidateId);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!sheetUrl && !canEdit) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.type !== 'application/pdf') {
            toast.error('The exam sheet must be a PDF');
            return;
          }
          if (file.size > MAX_BYTES) {
            toast.error('Please keep the PDF under 10 MB');
            return;
          }
          upload.mutate({ kind, file });
        }}
      />

      {sheetUrl ? (
        <>
          <a
            href={resolveApiFileUrl(sheetUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Exam sheet
          </a>
          {canEdit && (
            <>
              <button
                type="button"
                disabled={upload.isPending}
                onClick={() => inputRef.current?.click()}
                className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate(kind)}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600 disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {upload.isPending ? 'Attaching…' : 'Attach exam sheet'}
          <span className="text-slate-400">(optional)</span>
        </button>
      )}
    </div>
  );
}
