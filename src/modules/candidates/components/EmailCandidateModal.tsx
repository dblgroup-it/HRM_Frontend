import { useEffect, useState } from 'react';

import { Button, Input, Modal, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useEmailCandidate } from '../hooks/useCandidates';
import type { Candidate } from '../types/candidate.types';

interface Template {
  key: string;
  label: string;
  subject: (c: Candidate, role: string) => string;
  body: (c: Candidate, role: string) => string;
}

const TEMPLATES: Template[] = [
  {
    key: 'interview',
    label: 'Interview invite',
    subject: (_, role) => `Interview Invitation — ${role} | DBL Group`,
    body: (c, role) =>
      `Dear ${c.name},\n\nThank you for applying for the ${role} position at DBL Group. We were impressed with your profile and would like to invite you for an interview.\n\nKindly reply with your availability over the coming days and we will share the schedule and venue details.\n\nBest regards,\nDBL Group Recruitment`,
  },
  {
    key: 'docs',
    label: 'Request documents',
    subject: (_, role) => `Document Submission — ${role} | DBL Group`,
    body: (c) =>
      `Dear ${c.name},\n\nCongratulations on progressing in our selection process. To proceed, please share the following documents:\n\n• Updated CV\n• National ID / Passport copy\n• Academic certificates\n• Recent passport-size photograph\n\nYou may reply to this email with the attachments.\n\nBest regards,\nDBL Group Recruitment`,
  },
  {
    key: 'offer',
    label: 'Offer',
    subject: (_, role) => `Job Offer — ${role} | DBL Group`,
    body: (c, role) =>
      `Dear ${c.name},\n\nWe are pleased to offer you the position of ${role} at DBL Group. Our team will share the formal offer letter and onboarding details shortly.\n\nWe look forward to welcoming you aboard.\n\nBest regards,\nDBL Group Recruitment`,
  },
  {
    key: 'regret',
    label: 'Regret',
    subject: (_, role) => `Application Update — ${role} | DBL Group`,
    body: (c, role) =>
      `Dear ${c.name},\n\nThank you for your interest in the ${role} position and for the time you invested in our process. After careful consideration, we have decided to move forward with other candidates at this time.\n\nWe will keep your profile on file for future opportunities and wish you the very best.\n\nBest regards,\nDBL Group Recruitment`,
  },
  {
    key: 'custom',
    label: 'Custom',
    subject: () => '',
    body: () => '',
  },
];

export function EmailCandidateModal({
  reqId,
  candidate,
  designation,
  open,
  onClose,
}: {
  reqId: string;
  candidate: Candidate | null;
  designation: string;
  open: boolean;
  onClose: () => void;
}) {
  const email = useEmailCandidate(reqId);
  const [tpl, setTpl] = useState('interview');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Reset/prefill when the modal opens for a candidate.
  useEffect(() => {
    if (!open || !candidate) return;
    const t = TEMPLATES[0];
    setTpl('interview');
    setSubject(t.subject(candidate, designation));
    setMessage(t.body(candidate, designation));
  }, [open, candidate, designation]);

  if (!candidate) return null;

  const applyTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTpl(key);
    setSubject(t.subject(candidate, designation));
    setMessage(t.body(candidate, designation));
  };

  const send = () => {
    if (!subject.trim() || !message.trim()) return;
    email.mutate(
      { id: candidate.id, input: { subject: subject.trim(), message } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Email ${candidate.name}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-400">
            To: {candidate.email || 'no email on file'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={send}
              isLoading={email.isPending}
              disabled={!candidate.email || !subject.trim() || !message.trim()}
            >
              Send email
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {!candidate.email && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            This candidate has no email address. Add one first (edit the
            candidate) to send mail.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                tpl === t.key
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
        />
        <p className="text-xs text-slate-400">
          Sent from the DBL recruitment mailbox. The candidate can reply
          directly to that address.
        </p>
      </div>
    </Modal>
  );
}
