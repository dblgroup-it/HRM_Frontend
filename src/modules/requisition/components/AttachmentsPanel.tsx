import { useRef } from 'react';
import { FileText, Loader2, Lock, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import {
  useRemoveAttachment,
  useUploadAttachment,
} from '../hooks/useRequisitions';
import { resolveApiFileUrl } from '@shared/api';

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * The requisition's files — the detailed JD above all.
 *
 * The body only: it is tabbed against the job analysis inside
 * `JobAnalysisCard`, because filing the detailed JD and writing section B are
 * the same piece of work.
 */
export function AttachmentsSection({
  requisition,
  canEdit,
}: {
  requisition: Requisition;
  /**
   * False once the chain has signed the requisition off — the detailed JD is
   * part of what was approved, so from then on the files are a record rather
   * than a working folder. Corporate and the assigned recruiter keep the pen;
   * the server enforces the same rule.
   */
  canEdit: boolean;
}) {
  const reqId = requisition.id;
  const attachments = requisition.attachments ?? [];
  const upload = useUploadAttachment(reqId);
  const remove = useRemoveAttachment(reqId);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error('File must be 15 MB or smaller');
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success('Attachment added'),
      onError: () => toast.error('Could not upload the attachment'),
    });
  };

  return (
    <div>
      {attachments.length === 0 && !canEdit ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          No files were attached to this requisition.
        </p>
      ) : attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            {upload.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </span>
          <span className="text-sm font-medium text-slate-700">
            Attach the detailed JD
          </span>
          <span className="text-xs text-slate-400">
            PDF, Word or an image · up to 15 MB
          </span>
        </button>
      ) : (
        <>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li
                key={a.fileId}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50/30"
              >
                <a
                  href={resolveApiFileUrl(a.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 text-sm text-slate-700 hover:text-brand-700"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                  <span className="truncate font-medium">{a.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {(a.size / 1024).toFixed(0)} KB · {formatDate(a.uploadedAt)}
                  </span>
                </a>
                {canEdit && (
                  <button
                    type="button"
                    title="Remove attachment"
                    onClick={() => remove.mutate(a.fileId)}
                    className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              leftIcon={
                upload.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              Add file
            </Button>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Locked — this requisition has been approved.
            </p>
          )}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
