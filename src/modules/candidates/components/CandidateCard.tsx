import { useRef } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';

import { cn } from '@shared/lib';

import {
  useRemoveCandidate,
  useUpdateCandidate,
  useUploadCv,
} from '../hooks/useCandidates';
import type { Candidate, CandidateStage } from '../types/candidate.types';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

const STAGE_OPTIONS: { value: CandidateStage; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'final', label: 'Final' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
];

export function CandidateCard({
  candidate,
  reqId,
  canManage,
}: {
  candidate: Candidate;
  reqId: string;
  canManage: boolean;
}) {
  const update = useUpdateCandidate(reqId);
  const upload = useUploadCv(reqId);
  const remove = useRemoveCandidate(reqId);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = [candidate.email, candidate.phone].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-800">
          {candidate.name}
        </p>
        {canManage && (
          <button
            type="button"
            title="Remove candidate"
            onClick={() => remove.mutate(candidate.id)}
            className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {contact && (
        <p className="mt-0.5 truncate text-xs text-slate-400">{contact}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {candidate.cvUrl ? (
          <a
            href={candidate.cvUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
          >
            <FileText className="h-3.5 w-3.5" /> View CV
          </a>
        ) : canManage ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {upload.isPending ? 'Uploading…' : 'Add CV'}
          </button>
        ) : (
          <span className="text-xs text-slate-300">No CV</span>
        )}
      </div>

      {canManage && (
        <select
          value={candidate.stage}
          disabled={update.isPending}
          onChange={(e) =>
            update.mutate({
              id: candidate.id,
              input: { stage: e.target.value as CandidateStage },
            })
          }
          className={cn(
            'mt-2 h-7 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40',
          )}
        >
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Move to: {o.label}
            </option>
          ))}
        </select>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate({ id: candidate.id, cv: file });
          e.target.value = '';
        }}
      />
    </div>
  );
}
