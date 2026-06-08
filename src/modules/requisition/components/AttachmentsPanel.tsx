import { useRef } from 'react';
import { FileText, Loader2, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import {
  useRemoveAttachment,
  useUploadAttachment,
} from '../hooks/useRequisitions';

const MAX_BYTES = 15 * 1024 * 1024;

export function AttachmentsPanel({
  requisition,
}: {
  requisition: Requisition;
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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-brand-600" />
          Attachments
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
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
      </CardHeader>
      <CardBody>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li
                key={a.fileId}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <a
                  href={a.url}
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
                <button
                  type="button"
                  title="Remove attachment"
                  onClick={() => remove.mutate(a.fileId)}
                  className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </Card>
  );
}
