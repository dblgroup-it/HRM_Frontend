import { useState } from 'react';
import {
  Clock,
  Loader2,
  Save,
  Send,
  Sparkles,
  Undo2,
  UserRound,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { BusyOverlay, Button, Input, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useAuthStore } from '@modules/auth';
import {
  priorityLabel,
  priorityShortLabel,
  useMyPermissions,
} from '@modules/rbac';

import type { Requisition } from '../types/requisition.types';
import { useJobAnalysisOwnership } from '../hooks/useRequisitions';
import {
  useDraftJobAnalysis,
  useResendForJobAnalysis,
  useReturnForChanges,
  useSaveJobAnalysis,
} from '../hooks/useRequisitionActions';

/**
 * Section B · Job Analysis — the body, without a card of its own.
 *
 * The requisitioner states the vacancy; the job description and specification
 * are written here by the unit's Factory HR — or, where a unit has none, by
 * Head of Talent Acquisition / a Corporate Recruiter — and only then does the
 * approval chain start.
 *
 * The section has three faces, in this order of precedence:
 *  1. handed back to the raiser (amber), who amends section A and resends;
 *  2. open to this viewer, as a form they submit;
 *  3. read-only — either waiting on someone else, or already completed.
 *
 * Rendered inside `JobAnalysisCard`, which tabs it against the attachments:
 * the detailed JD is an attachment, so writing one and filing the other are
 * the same piece of work and belong behind one heading.
 */
export function JobAnalysisSection({
  requisition: req,
}: {
  requisition: Requisition;
}) {
  const open = req.status === 'pending_job_analysis';
  const myUserId = useAuthStore((s) => s.user?.id);
  const { data: perms } = useMyPermissions();
  const ownership = useJobAnalysisOwnership(req.id, open);

  const save = useSaveJobAnalysis(req.id);
  const returnForChanges = useReturnForChanges(req.id);
  const resend = useResendForJobAnalysis(req.id);
  const draft = useDraftJobAnalysis(req.id);

  const [jobDescription, setJobDescription] = useState(req.jobDescription);
  const [education, setEducation] = useState(req.education);
  const [experience, setExperience] = useState(req.experience);
  const [others, setOthers] = useState(req.others);
  const [returnNote, setReturnNote] = useState('');
  const [returning, setReturning] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [hint, setHint] = useState('');

  const returnedAt = req.jobAnalysis?.returnedAt ?? null;
  const isRaiser = !!myUserId && req.raisedById === myUserId;
  const canResend = !!returnedAt && (isRaiser || !!perms?.isSuperUser);
  const canWrite = open && !returnedAt && Boolean(ownership.data?.canComplete);

  const input = () => ({
    jobDescription: jobDescription.trim(),
    education: education.trim(),
    experience: experience.trim(),
    others: others.trim(),
  });

  const submit = () =>
    save.mutate(
      { ...input(), submit: true },
      {
        onSuccess: () => toast.success('Job analysis sent for approval'),
        onError: (e) => toast.error((e as Error).message),
      },
    );

  const saveDraft = () =>
    save.mutate(
      { ...input(), submit: false },
      {
        onSuccess: () => toast.success('Saved — the requisition stays here'),
        onError: (e) => toast.error((e as Error).message),
      },
    );

  const sendBack = () =>
    returnForChanges.mutate(returnNote.trim(), {
      onSuccess: () => {
        toast.success('Sent back to the requisitioner');
        setReturnNote('');
        setReturning(false);
      },
      onError: (e) => toast.error((e as Error).message),
    });

  /**
   * Draft the four fields from the vacancy.
   *
   * Nothing is saved — the fields are filled in place and the writer edits and
   * submits them as their own, exactly as if they had typed them. Whatever is
   * already there goes up with the request, so pressing this a second time
   * refines the draft rather than throwing it away.
   */
  const runAi = () =>
    draft.mutate(
      { ...input(), hint: hint.trim() || undefined },
      {
        onSuccess: (result) => {
          if (result.jobDescription) setJobDescription(result.jobDescription);
          if (result.education) setEducation(result.education);
          if (result.experience) setExperience(result.experience);
          if (result.others) setOthers(result.others);
          toast.success('Drafted — read it through before you submit');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );

  const completedBy = req.jobAnalysis?.completedBy;
  const completedAt = req.jobAnalysis?.completedAt;
  const owners = ownership.data?.owners ?? [];
  const assignee = ownership.data?.assignee ?? req.jobAnalysis?.assignee ?? null;
  /** This viewer's own place in the layering — "as second priority". */
  const myRank = owners.find((o) => o.id === myUserId)?.priority ?? null;

  /**
   * Who sees whose desk it is sitting on.
   *
   * The unit's HR layering — the named holder, their employee code, their
   * place in the queue, who is on leave — is HR's own business. Only the
   * people in that queue and the corporate side read it; the requisitioner
   * and the approvers get the state on its own. Somebody in the queue is
   * recognised by being in `owners`, so a holder waiting behind a colleague
   * still sees where they stand.
   */
  const showsOwners =
    !!perms?.isSuperUser ||
    (!!myUserId && owners.some((o) => o.id === myUserId)) ||
    (perms?.roles ?? []).some(
      (r) =>
        r.key === 'corporate_hr' ||
        r.key === 'chro' ||
        r.key === 'corporate_recruiter' ||
        r.key === 'factory_hr',
    );

  return (
    <div className="space-y-4">
      {completedBy && (
        <p className="text-xs text-slate-400">
          Written by {completedBy.name}
          {completedAt ? ` · ${formatDate(completedAt)}` : ''}
        </p>
      )}

      {/* 1 · Handed back: section A is the raiser's to fix. */}
      {open && returnedAt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <Undo2 className="h-4 w-4 shrink-0" />
            Sent back to {req.raisedBy || 'the requisitioner'} ·{' '}
            {formatDate(returnedAt)}
          </p>
          {req.jobAnalysis?.returnNote && (
            <p className="mt-1.5 text-sm text-amber-800">
              “{req.jobAnalysis.returnNote}”
            </p>
          )}
          {canResend && (
            <Button
              size="sm"
              className="mt-3"
              isLoading={resend.isPending}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() =>
                resend.mutate(undefined, {
                  onSuccess: () => toast.success('Resent for job analysis'),
                  onError: (e) => toast.error((e as Error).message),
                })
              }
            >
              Resend for job analysis
            </Button>
          )}
        </div>
      )}

      {/* 2 · This viewer's to write. */}
      {canWrite && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-sm text-slate-600">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              {ownership.data?.viaFactoryHr
                ? myRank
                  ? `Addressed to you as ${priorityLabel(myRank)?.toLowerCase()} for this unit.`
                  : 'Yours as Factory HR for this unit.'
                : `${req.unitFactory} has no Factory HR available, so this is yours to complete.`}{' '}
              Submitting starts the approval chain. The detailed JD goes in the
              Attachments tab.
            </span>
          </p>

          {/* AI assist — here and nowhere else. Section B is written FROM
              section A, so this is the first moment there is anything to
              draft from; the requisitioner has no use for it. */}
          <div className="overflow-hidden rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50/80 via-white to-emerald-50/60">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                Draft this from the vacancy
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAiOpen((v) => !v)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-white/70 hover:text-slate-700"
                >
                  {aiOpen ? 'Hide steer' : 'Add a steer'}
                </button>
                <Button
                  size="sm"
                  isLoading={draft.isPending}
                  leftIcon={
                    draft.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )
                  }
                  onClick={runAi}
                >
                  {draft.isPending ? 'Drafting…' : 'Draft with AI'}
                </Button>
              </div>
            </div>
            {aiOpen && (
              <div className="border-t border-brand-100/70 px-3.5 py-2.5">
                <Input
                  autoFocus
                  placeholder="e.g. knitting floor, must have run a 3-shift line"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runAi();
                  }}
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Optional. The draft already knows the designation, department,
                  unit, grade and post count — this is for what only you know.
                </p>
              </div>
            )}
            <p className="border-t border-brand-100/70 bg-white/50 px-3.5 py-2 text-[11px] text-slate-500">
              Nothing is saved until you submit. Read every line — it is your
              job analysis the approvers will sign.
            </p>
          </div>

          <Textarea
            label="Job description"
            rows={5}
            placeholder="Duties and responsibilities of the post"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Education & training"
              placeholder="e.g. B.Sc. in Textile Engineering (BUTex / AUST)"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
            <Input
              label="Experience"
              placeholder="e.g. 3–5 years in a woven unit"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Others"
                placeholder="e.g. Ability to work in a shift-based environment"
                value={others}
                onChange={(e) => setOthers(e.target.value)}
              />
            </div>
          </div>

          {/* Sending it back needs a reason: the raiser gets only this note. */}
          {returning && (
            <Textarea
              label="What needs changing"
              rows={2}
              placeholder="e.g. the designation doesn't match the seat — please confirm the grade"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              isLoading={save.isPending && save.variables?.submit !== false}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={submit}
            >
              Submit for approval
            </Button>
            <Button
              variant="outline"
              isLoading={save.isPending && save.variables?.submit === false}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={saveDraft}
            >
              Save
            </Button>
            {returning ? (
              <>
                <Button
                  variant="danger"
                  isLoading={returnForChanges.isPending}
                  disabled={returnNote.trim().length < 3}
                  leftIcon={<Undo2 className="h-4 w-4" />}
                  onClick={sendBack}
                >
                  Send back
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReturning(false);
                    setReturnNote('');
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                leftIcon={<Undo2 className="h-4 w-4" />}
                onClick={() => setReturning(true)}
              >
                Return to raiser
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3a · Open, but someone else's.
          Who has it, and where they sit in the unit's HR layering, is HR's
          own business: the requisitioner asked for a headcount and does not
          need a named person, their employee code and their place in a
          queue. They get the state and nothing else — with something moving,
          so a page that is genuinely waiting looks like it is waiting rather
          than like it has stalled. */}
      {open && !returnedAt && !canWrite && !showsOwners && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-4 py-8 text-center">
          <span className="relative flex h-12 w-12 items-center justify-center">
            {/* Two rings leaving at different times — one pulse reads as a
                notification badge, two read as something in progress. */}
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-200/50" />
            <span
              className="absolute inset-1 animate-ping rounded-full bg-brand-300/40"
              style={{ animationDelay: '600ms' }}
            />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
              <Clock className="h-5 w-5" />
            </span>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Waiting for job analysis
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
              HR is writing the job description and specification. It goes to
              its approvers as soon as that is done — you will be notified.
            </p>
          </div>
          {/* A track that is always moving: the wait is real and open-ended,
              so a progress bar would be a lie about how far along it is. */}
          <span className="h-1 w-40 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,theme(colors.brand.500),transparent)] bg-[length:200%_100%]" />
          </span>
        </div>
      )}

      {/* The same wait, for the HR side — who holds it, and the queue behind
          them, which is exactly what they need and nobody else does. */}
      {open && !returnedAt && !canWrite && showsOwners && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {ownership.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            Waiting on the job analysis
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {assignee
              ? `${assignee.name} has this one. It moves to the next Factory HR in line if they go on leave.`
              : ownership.data?.viaFactoryHr === false
                ? `${req.unitFactory} has no Factory HR available, so Head of Talent Acquisition or a Corporate Recruiter completes it.`
                : `Factory HR for ${req.unitFactory} writes the job description before this goes for approval.`}
          </p>
          {owners.length > 0 && (
            <ul className="mt-2 space-y-1">
              {owners.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-1.5 text-xs text-slate-500"
                >
                  <UserRound className="h-3.5 w-3.5 text-slate-400" />
                  <span
                    className={cn(
                      o.id === assignee?.id && 'font-medium text-slate-700',
                    )}
                  >
                    {o.name}
                  </span>
                  {o.priority != null && (
                    <span className="rounded bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600">
                      {priorityShortLabel(o.priority)}
                    </span>
                  )}
                  {o.onLeave && (
                    <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">
                      on leave
                    </span>
                  )}
                  <span className="font-mono text-slate-400">
                    {o.employeeCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 3b · Already written — the record, as every other section reads. */}
      {!open && (
        <>
          <div>
            <p className="text-xs text-slate-400">Job description</p>
            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">
              {req.jobDescription || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Education & training</p>
            <p className="mt-0.5 text-sm text-slate-700">
              {req.education || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Experience</p>
            <p className="mt-0.5 text-sm text-slate-700">
              {req.experience || '—'}
            </p>
          </div>
          {req.others && (
            <div>
              <p className="text-xs text-slate-400">Others</p>
              <p className="mt-0.5 text-sm text-slate-700">{req.others}</p>
            </div>
          )}
        </>
      )}

      <BusyOverlay
        show={
          save.isPending || returnForChanges.isPending || resend.isPending
        }
        label="Saving…"
      />
      <BusyOverlay
        show={draft.isPending}
        label="Drafting the job analysis…"
        sublabel="Reading the vacancy and writing section B."
      />
    </div>
  );
}
