import { useRef } from 'react';
import { FileText, Mail, Trash2, Upload } from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { cn } from '@shared/lib';

import {
  useRemoveCandidate,
  useUpdateCandidate,
  useUploadCv,
} from '../hooks/useCandidates';
import type { Candidate, CandidateStage } from '../types/candidate.types';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

const STAGE_META: Record<CandidateStage, { label: string; tone: string }> = {
  applied: { label: 'Applied', tone: 'bg-slate-100 text-slate-600' },
  shortlisted: { label: 'Shortlisted', tone: 'bg-sky-100 text-sky-700' },
  interview: { label: 'Interview', tone: 'bg-amber-100 text-amber-700' },
  final: { label: 'Final', tone: 'bg-violet-100 text-violet-700' },
  selected: { label: 'Selected', tone: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700' },
};

const STAGE_ORDER: CandidateStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'final',
  'selected',
  'rejected',
];

const SOURCE_LABEL: Record<string, string> = {
  application: 'Applied online',
  drive: 'Drive link',
  upload: 'Uploaded',
  manual: 'Added manually',
  email: 'Email',
};

export function CandidateRow({
  candidate,
  reqId,
  canManage,
  onEmail,
}: {
  candidate: Candidate;
  reqId: string;
  canManage: boolean;
  onEmail: (c: Candidate) => void;
}) {
  const update = useUpdateCandidate(reqId);
  const upload = useUploadCv(reqId);
  const remove = useRemoveCandidate(reqId);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = [candidate.email, candidate.phone].filter(Boolean).join(' · ');
  const meta = STAGE_META[candidate.stage];

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
      <Avatar name={candidate.name} size="sm" />

      <div className="min-w-[140px] flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800">
            {candidate.name}
          </p>
          <span className="hidden shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
            {SOURCE_LABEL[candidate.source] ?? candidate.source}
          </span>
        </div>
        <p className="truncate text-xs text-slate-400">
          {contact || 'No contact details'}
        </p>
      </div>

      {/* CV */}
      {candidate.cvUrl ? (
        <a
          href={candidate.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        >
          <FileText className="h-3.5 w-3.5" /> CV
        </a>
      ) : canManage ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {upload.isPending ? 'Uploading…' : 'CV'}
        </button>
      ) : (
        <span className="text-xs text-slate-300">No CV</span>
      )}

      {/* Email */}
      {canManage && (
        <button
          type="button"
          onClick={() => onEmail(candidate)}
          disabled={!candidate.email}
          title={candidate.email ? `Email ${candidate.email}` : 'No email on file'}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </button>
      )}

      {/* Stage */}
      {canManage ? (
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
            'h-8 rounded-md border-0 px-2 text-xs font-medium focus:ring-2 focus:ring-brand-500/40',
            meta.tone,
          )}
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_META[s].label}
            </option>
          ))}
        </select>
      ) : (
        <span
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium',
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      )}

      {canManage && (
        <button
          type="button"
          title="Remove candidate"
          onClick={() => remove.mutate(candidate.id)}
          className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
