import { Fragment, useMemo, useState } from 'react';
import {
  ClipboardList,
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

import {
  Badge,
  Button,
  Combobox,
  EmptyState,
  ErrorCard,
  Modal,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { toast } from 'sonner';

import { boardApi } from '../api/board.api';
import { printSheet } from '../utils/exportSheet';

import {
  useHrInbox,
  useSendSheet,
  useSheetApprovers,
  useResendSheet,
  useSheets,
  useUpdateSheetRow,
} from '../hooks/useBoard';
import type {
  SheetDetail,
  SheetRow,
  SheetSummary,
} from '../types/board.types';
import { resolveApiFileUrl } from '@shared/api';

const money = (n: number | null) =>
  n == null
    ? '—'
    : `${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}/-`;

/**
 * Head of Talent Acquisition's single page for the board chain.
 *
 * The recruiter forwards candidates one at a time, so they arrive as a
 * trickle. This is where they collect: pick whoever is ready — one of them or
 * all of them — and send a single Hiring Approval Sheet on to the CHRO and
 * then the board, the way the paper form works.
 */
export default function ApprovalSheetsPage() {
  const inbox = useHrInbox();
  const sheets = useSheets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);

  const rows = inbox.data ?? [];
  const chosen = rows.filter((r) => selected.has(r.approvalId));
  const allSel = rows.length > 0 && rows.every((r) => selected.has(r.approvalId));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hiring Approval Sheets"
        description="Candidates the recruiters have forwarded to you. Put them on one sheet and send it to the CHRO — one at a time or the whole list together."
      />

      {/* Waiting on you */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Waiting on you
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {rows.length === 0
                ? 'Nothing forwarded at the moment'
                : `${rows.length} candidate${rows.length === 1 ? '' : 's'} forwarded by recruiters`}
            </p>
          </div>
          {chosen.length > 0 && (
            <Button
              size="sm"
              leftIcon={<Send className="h-3.5 w-3.5" />}
              onClick={() => setSendOpen(true)}
            >
              Send {chosen.length} on one sheet
            </Button>
          )}
        </div>

        {inbox.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : inbox.isError ? (
          <ErrorCard
            className="m-4"
            title="Couldn't load your queue"
            message={(inbox.error as Error)?.message}
            onRetry={() => void inbox.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Nothing waiting"
            description="When a recruiter forwards a candidate for board approval, they land here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[0.6875rem] uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSel}
                      onChange={() =>
                        setSelected(
                          allSel
                            ? new Set()
                            : new Set(rows.map((r) => r.approvalId)),
                        )
                      }
                      aria-label="Select all"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Position</th>
                  <th className="px-3 py-2.5">Dept.</th>
                  <th className="px-3 py-2.5">Unit</th>
                  <th className="px-3 py-2.5">Education</th>
                  <th className="px-3 py-2.5 text-center">Req.</th>
                  <th className="px-3 py-2.5">Team</th>
                  <th className="px-3 py-2.5 text-center">Total Exp.</th>
                  <th className="px-3 py-2.5">Last Org.</th>
                  <th className="px-3 py-2.5 text-right">Salary</th>
                  <th className="px-3 py-2.5">Remark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.approvalId}>
                  <tr
                    onClick={() => toggle(r.approvalId)}
                    className={cn(
                      'cursor-pointer border-t border-slate-100 transition-colors',
                      selected.has(r.approvalId)
                        ? 'bg-brand-50/50'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.approvalId)}
                        onChange={() => toggle(r.approvalId)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${r.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {r.name}
                      {/* The CV goes with the name — the sheet mirrors DBL's
                          paper form and gains no column of its own. */}
                      {r.cvUrl && (
                        <a
                          href={resolveApiFileUrl(r.cvUrl)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-normal text-brand-600 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          View CV
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{r.position}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.department}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.unit}</td>
                    <td className="max-w-[14rem] px-3 py-2.5 text-xs text-slate-600">
                      <span className="line-clamp-2">{r.education || '—'}</span>
                      {r.educationFromCv && (
                        <span className="mt-0.5 block text-[0.625rem] font-medium uppercase tracking-wide text-violet-500">
                          from CV
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge tone={r.requirement === 'New' ? 'info' : 'neutral'}>
                        {r.requirement}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.team || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                      {r.totalExperience || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.lastOrganization || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                      {money(r.salary)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.remark}</td>
                  </tr>
                  {/* The vacancy's own sign-off chain, so it can be checked
                      before the sheet is sent on. */}
                  {r.approvalChain && (
                    <tr
                      onClick={() => toggle(r.approvalId)}
                      className={cn(
                        'cursor-pointer',
                        selected.has(r.approvalId)
                          ? 'bg-brand-50/50'
                          : 'bg-slate-50/70',
                      )}
                    >
                      <td
                        colSpan={13}
                        className="px-3 pb-2 pt-1 text-[0.6875rem] leading-relaxed text-slate-500"
                      >
                        <span className="text-slate-400">Vacancy approved: </span>
                        {r.approvalChain}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sent sheets */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Sheets you have sent
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Where each one has got to in the chain
            </p>
          </div>
        </div>

        {sheets.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (sheets.data ?? []).length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="h-6 w-6" />}
            title="No sheets yet"
            description="Select candidates above and send your first approval sheet."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {(sheets.data ?? []).map((s) => (
              <SheetRowItem key={s.id} sheet={s} />
            ))}
          </div>
        )}
      </section>

      {sendOpen && (
        <SendSheetModal
          rows={chosen}
          onClose={() => setSendOpen(false)}
          onSent={() => {
            setSendOpen(false);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}

function SheetRowItem({ sheet }: { sheet: SheetSummary }) {
  const resend = useResendSheet();
  const [busy, setBusy] = useState<'print' | 'export' | null>(null);

  /**
   * The rows live only in the sent email and the approver's token page, so
   * they are fetched on demand rather than loaded for every sheet in the list.
   */
  const withSheet = async (
    what: 'print' | 'export',
    run: (detail: SheetDetail) => void,
  ) => {
    setBusy(what);
    try {
      run(await boardApi.sheetDetail(sheet.id));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : `Could not ${what} ${sheet.reference}`,
      );
    } finally {
      setBusy(null);
    }
  };
  const tone =
    sheet.status === 'approved'
      ? 'success'
      : sheet.status === 'rejected'
        ? 'danger'
        : 'warning';
  const Icon =
    sheet.status === 'approved'
      ? CheckCircle2
      : sheet.status === 'rejected'
        ? XCircle
        : Clock;

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-xs font-semibold text-slate-700">
          {sheet.reference}
        </span>
        <Badge tone={tone}>
          <Icon className="mr-1 h-3 w-3" />
          {sheet.status === 'pending'
            ? `With ${sheet.currentStage === 'chro' ? 'CHRO' : 'the Board'}`
            : sheet.status === 'approved'
              ? 'Approved'
              : 'Returned'}
        </Badge>
        <span className="text-xs text-slate-500">
          {sheet.candidateCount} candidate{sheet.candidateCount === 1 ? '' : 's'}
          {sheet.chroName ? ` · CHRO: ${sheet.chroName}` : ''}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          {formatDate(sheet.createdAt)}
        </span>
        {/* Each sheet prints and exports on its own — a board pack is
            assembled one approval at a time, not as a whole year's list. */}
        <Button
          size="sm"
          variant="ghost"
          isLoading={busy === 'print'}
          title={`Print ${sheet.reference}`}
          onClick={() =>
            void withSheet('print', (d) => {
              if (!printSheet(d)) {
                toast.error('Allow pop-ups for this site to print the sheet.');
              }
            })
          }
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isLoading={busy === 'export'}
          title={`Export ${sheet.reference} to a spreadsheet`}
          onClick={() => {
            setBusy('export');
            boardApi
              .exportSheet(sheet.id)
              .catch((e: unknown) =>
                toast.error(
                  e instanceof Error ? e.message : 'Could not export the sheet',
                ),
              )
              .finally(() => setBusy(null));
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Excel
        </Button>

        {/* Links get lost. Re-mails only those still to reply, with a fresh
            link — a decision already given is never asked for twice. */}
        {sheet.status === 'pending' && (
          <Button
            size="sm"
            variant="ghost"
            isLoading={resend.isPending}
            title={`Send ${sheet.reference} again to ${sheet.currentStage === 'chro' ? 'the CHRO' : 'the board'}`}
            onClick={() => resend.mutate(sheet.id)}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Resend
          </Button>
        )}
      </div>

      <p className="mt-1 truncate text-xs text-slate-500">
        {sheet.candidateNames.join(', ')}
      </p>

      {sheet.rejectedReason && (
        <p className="mt-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs leading-5 text-rose-700">
          Returned — “{sheet.rejectedReason}”
        </p>
      )}

      {sheet.votes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {sheet.votes.map((v, i) => (
            <span
              key={`${v.name}-${i}`}
              className={cn(
                'text-xs',
                v.status === 'approved'
                  ? 'text-emerald-700'
                  : v.status === 'rejected'
                    ? 'text-rose-700'
                    : 'text-slate-400',
              )}
            >
              {v.name} ({v.stage === 'chro' ? 'CHRO' : 'Board'}) — {v.status}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Choose the CHRO and the board members, then send. */
function SendSheetModal({
  rows,
  onClose,
  onSent,
}: {
  rows: SheetRow[];
  onClose: () => void;
  onSent: () => void;
}) {
  const send = useSendSheet();
  const { data: approvers } = useSheetApprovers();
  const [chroId, setChroId] = useState('');
  const [members, setMembers] = useState<Set<string>>(new Set());

  // Board members come from the configured groups, de-duplicated: the same
  // person can sit on more than one group.
  const allMembers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; hasEmail: boolean }>();
    (approvers?.groups ?? []).forEach((g) =>
      g.members.forEach((m) => seen.set(m.id, m)),
    );
    return [...seen.values()];
  }, [approvers]);

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Send ${rows.length} candidate${rows.length === 1 ? '' : 's'} as one sheet`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            The CHRO approves or returns the sheet as a whole, then the board.
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={<Send className="h-3.5 w-3.5" />}
              disabled={!chroId || members.size === 0 || send.isPending}
              isLoading={send.isPending}
              onClick={() =>
                send.mutate(
                  {
                    approvalIds: rows.map((r) => r.approvalId),
                    chroId,
                    boardMemberIds: [...members],
                  },
                  { onSuccess: onSent },
                )
              }
            >
              Send sheet
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Check the sheet before it goes out. The three CV-derived columns are
            editable here because an AI reading of a CV is a starting point,
            not something to put in front of the board unchecked. */}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <SheetRowEditor key={r.approvalId} row={r} index={i} />
          ))}
        </div>

        <Combobox
          label="CHRO"
          placeholder="Who signs as CHRO?"
          options={(approvers?.chro ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          value={chroId}
          onChange={setChroId}
          hint="They receive the sheet first; the board follows once they approve."
        />

        <div>
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
            Board members
          </p>
          {allMembers.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              No board groups are set up yet. Add members under Configuration →
              Board Groups first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allMembers.map((m) => {
                const on = members.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.hasEmail}
                    title={m.hasEmail ? undefined : 'No email address on file'}
                    onClick={() =>
                      setMembers((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
                      on
                        ? 'bg-brand-600 text-white ring-brand-600'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                      !m.hasEmail && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {m.name}
                    {!m.hasEmail && (
                      <span className="ml-1 opacity-70">· no email</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {send.isError && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {(send.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * One row of the sheet, with its CV-derived columns open for correction.
 *
 * Saved per field on blur rather than behind a Save button — HR is checking a
 * list, and a button per row would be three clicks per candidate.
 */
function SheetRowEditor({ row, index }: { row: SheetRow; index: number }) {
  const update = useUpdateSheetRow();
  const [education, setEducation] = useState(row.education ?? '');
  const [experience, setExperience] = useState(row.totalExperience ?? '');
  const [lastOrg, setLastOrg] = useState(row.lastOrganization ?? '');

  const save = (patch: Record<string, string>) => {
    const [[key, value]] = Object.entries(patch);
    const current =
      key === 'education'
        ? (row.education ?? '')
        : key === 'totalExperience'
          ? (row.totalExperience ?? '')
          : (row.lastOrganization ?? '');
    if (value.trim() === current.trim()) return;
    update.mutate({ approvalId: row.approvalId, [key]: value });
  };

  const field =
    'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand-400 focus:outline-none';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-slate-400">{index + 1}.</span>
        <span className="font-semibold text-slate-900">{row.name}</span>
        {row.cvUrl && (
          <a
            href={resolveApiFileUrl(row.cvUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            <FileText className="h-3 w-3" />
            CV
          </a>
        )}
        <span className="text-slate-500">
          {row.position} · {row.unit}
        </span>
        <Badge tone={row.requirement === 'New' ? 'info' : 'neutral'}>
          {row.requirement}
        </Badge>
        <span className="ml-auto font-semibold tabular-nums text-slate-900">
          {money(row.salary)}
        </span>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[2fr,1fr,1.5fr]">
        <label className="block">
          <span className="mb-0.5 flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-wide text-slate-500">
            Education
            {row.educationFromCv && (
              <span className="text-violet-500">· read from CV</span>
            )}
          </span>
          <input
            className={field}
            value={education}
            placeholder="e.g. BSc (Tex) - BUTex (2023)"
            onChange={(e) => setEducation(e.target.value)}
            onBlur={() => save({ education })}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[0.625rem] font-medium uppercase tracking-wide text-slate-500">
            Total Exp.
          </span>
          <input
            className={field}
            value={experience}
            placeholder="e.g. 8.5 Yrs"
            onChange={(e) => setExperience(e.target.value)}
            onBlur={() => save({ totalExperience: experience })}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[0.625rem] font-medium uppercase tracking-wide text-slate-500">
            Last Organization
          </span>
          <input
            className={field}
            value={lastOrg}
            placeholder="e.g. Petromax LPG Limited"
            onChange={(e) => setLastOrg(e.target.value)}
            onBlur={() => save({ lastOrganization: lastOrg })}
          />
        </label>
      </div>
    </div>
  );
}
