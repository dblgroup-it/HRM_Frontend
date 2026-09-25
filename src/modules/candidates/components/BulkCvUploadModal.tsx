import { useRef, useState } from 'react';
import { AlertTriangle, FileText, Files, Upload, X } from 'lucide-react';

import { BusyOverlay, Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useBulkCreateCandidates } from '../hooks/useCandidates';
import { nameFromFileName } from './bulkCvName';
import { CvSourcePicker } from './CvSourcePicker';

const MAX_FILES = 30;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

interface Row {
  key: string;
  file: File;
  name: string;
}

/**
 * Several CVs at once — one candidate each, all from one source.
 *
 * Every CV needs a name, so each file gets one guessed from its filename and
 * shown for correction before anything is sent. Email and phone are left to
 * the AI screen, which reads them off the CV exactly as it does for a single
 * upload. The source list is the one Head of Talent Acquisition ticked for
 * this requisition, so a recruiter records where they actually looked.
 */
export function BulkCvUploadModal({
  reqId,
  cvSources,
  open,
  onClose,
}: {
  reqId: string;
  /** The requisition's ticked sources; empty or absent offers the full list. */
  cvSources?: CvSource[];
  open: boolean;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const bulk = useBulkCreateCandidates(reqId, (done, total) =>
    setProgress({ done, total }),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [refused, setRefused] = useState<string[]>([]);
  const [failed, setFailed] = useState<{ fileName: string; error: string }[]>(
    [],
  );
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setSource('');
    setRows([]);
    setRefused([]);
    setFailed([]);
  };
  const close = () => {
    reset();
    onClose();
  };

  const add = (list: FileList | File[]) => {
    const notes: string[] = [];
    const next = [...rows];
    for (const f of Array.from(list)) {
      if (f.type !== 'application/pdf') {
        notes.push(`${f.name} — PDF only`);
      } else if (f.size > MAX_PDF_BYTES) {
        notes.push(`${f.name} — over 5 MB`);
      } else if (next.length >= MAX_FILES) {
        notes.push(`${f.name} — ${MAX_FILES} CVs per upload`);
      } else if (!next.some((r) => r.file.name === f.name && r.file.size === f.size)) {
        next.push({
          key: `${f.name}-${f.size}-${f.lastModified}`,
          file: f,
          name: nameFromFileName(f.name),
        });
      }
    }
    setRows(next);
    setRefused(notes);
  };

  const invalidName = rows.some((r) => r.name.trim().length < 2);
  const canSubmit = Boolean(source) && rows.length > 0 && !invalidName;

  const submit = () => {
    if (!canSubmit) return;
    bulk.mutate(
      {
        cvSource: source,
        files: rows.map((r) => r.file),
        names: rows.map((r) => r.name.trim()),
      },
      {
        onSuccess: (result) => {
          if (!result.failed.length) {
            close();
            return;
          }
          // Keep only what did not go in, so a retry cannot duplicate the rest.
          const bad = new Set(result.failed.map((f) => f.fileName));
          setRows((prev) => prev.filter((r) => bad.has(r.file.name)));
          setFailed(result.failed);
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={bulk.isPending ? () => undefined : close}
      title="Bulk CV upload"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {rows.length
              ? `${rows.length} CV${rows.length === 1 ? '' : 's'} ready`
              : `Up to ${MAX_FILES} PDFs, 5 MB each`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={close} disabled={bulk.isPending}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              isLoading={bulk.isPending}
              disabled={!canSubmit}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              {bulk.isPending
                ? `Uploading ${rows.length}…`
                : `Add ${rows.length || ''} candidate${rows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      }
    >
      {/* The app's own full-screen loader: an upload to Drive takes a while,
          and nothing on the dialog should be touched while it runs. */}
      <BusyOverlay
        show={bulk.isPending}
        label={
          progress && progress.total
            ? `Uploading CV ${Math.min(progress.done + 1, progress.total)} of ${progress.total}${
                rows[progress.done] ? ` — ${rows[progress.done].name}` : ''
              }`
            : 'Uploading CVs…'
        }
        sublabel="Saving each CV to the requisition's Drive folder. Keep this tab open."
      />
      <div className="space-y-4">
        <CvSourcePicker
          label="Where did these CVs come from?"
          value={source}
          onChange={setSource}
          cvSources={cvSources}
        />

        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            add(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40',
          )}
        >
          <Files className="h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            Drop PDF CVs here, or click to choose
          </span>
          <span className="text-xs text-slate-400">
            Each file becomes one candidate. Email and mobile are read from
            the CV by the AI screen.
          </span>
        </button>

        {refused.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold">Not added:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {refused.map((r) => (
                <li key={r} className="break-all">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {failed.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">
                These did not go in — the rest were added. Fix and try again,
                or remove them.
              </p>
              <ul className="mt-1 space-y-0.5">
                {failed.map((f) => (
                  <li key={f.fileName} className="break-words">
                    <span className="font-medium">{f.fileName}</span>: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Candidate names{' '}
              <span className="font-normal text-slate-400">
                — taken from the file names; correct any that are wrong
              </span>
            </p>
            <ul className="max-h-[40vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center gap-2 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <input
                      value={r.name}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.key === r.key ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      aria-label={`Candidate name for ${r.file.name}`}
                      className={cn(
                        'h-8 w-full rounded-md border px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                        r.name.trim().length < 2
                          ? 'border-rose-300'
                          : 'border-slate-200 focus:border-brand-400',
                      )}
                    />
                    <p
                      className="mt-0.5 truncate text-[0.6875rem] text-slate-400"
                      title={r.file.name}
                    >
                      {r.file.name} · {(r.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${r.file.name}`}
                    disabled={bulk.isPending}
                    onClick={() =>
                      setRows((prev) => prev.filter((x) => x.key !== r.key))
                    }
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
