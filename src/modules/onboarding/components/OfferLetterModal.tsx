import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import type { OnboardingCandidate } from '../types/onboarding.types';

interface Props {
  candidate: OnboardingCandidate;
  open: boolean;
  onClose: () => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function OfferLetterModal({ candidate, open, onClose }: Props) {
  if (!open) return null;

  const today = fmtDate(new Date().toISOString());

  const print = () => {
    const el = document.getElementById('offer-letter-print-area');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Offer Letter – ${candidate.name}</title>
<style>
  @page { margin: 2.5cm; size: A4; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #111; }
  h1 { font-size: 16pt; margin-bottom: 0; }
  .logo { font-weight: 700; font-size: 18pt; color: #1877c0; letter-spacing: 1px; }
  .sub { font-size: 9pt; color: #555; margin-top: 2px; }
  hr { border: none; border-top: 2px solid #1877c0; margin: 12px 0; }
  .label { font-weight: 700; }
  .footer { margin-top: 48px; }
  .sig-line { margin-top: 60px; border-top: 1px solid #333; width: 200px; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 4px 0; vertical-align: top; }
  td:first-child { width: 180px; font-weight: 600; color: #444; }
</style>
</head>
<body>
${el.innerHTML}
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText className="h-4 w-4 text-brand-600" />
            Offer Letter Preview
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={print}
            >
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable letter area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div
            id="offer-letter-print-area"
            className="mx-auto max-w-2xl rounded-xl bg-white p-10 shadow-sm ring-1 ring-slate-200 text-[13px] leading-relaxed text-slate-800"
          >
            {/* Letterhead */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-brand-600 tracking-wide">DBL GROUP</p>
                <p className="text-[11px] text-slate-500 mt-0.5">DBL House, Karwan Bazar, Dhaka-1215, Bangladesh</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{today}</p>
            </div>
            <hr className="my-3 border-t-2 border-brand-500" />

            <p className="mb-6">
              <span className="font-semibold">Ref:</span> {candidate.code}/{new Date().getFullYear()}/OL
            </p>

            {/* Addressee */}
            <p className="mb-1">
              <span className="font-semibold">{candidate.name}</span>
            </p>
            <p className="mb-6 text-slate-500 text-[12px]">
              [Candidate&rsquo;s address]
            </p>

            <p className="mb-4">Dear <strong>{candidate.name.split(' ')[0]}</strong>,</p>

            <p className="mb-3">
              <strong>Subject: Offer of Employment — {candidate.designation}</strong>
            </p>

            <p className="mb-3">
              We are pleased to inform you that following the successful completion of our
              selection process, <strong>DBL Group</strong> is pleased to offer you the
              position of <strong>{candidate.designation}</strong> at{' '}
              <strong>{candidate.unit}</strong>
              {candidate.department ? ` (${candidate.department})` : ''}.
            </p>

            <p className="mb-4">
              The key terms of your appointment are outlined below:
            </p>

            {/* Terms table */}
            <table className="w-full text-[12px] border-collapse mb-4">
              <tbody>
                {[
                  ['Position', candidate.designation],
                  ['Business Unit', candidate.unit],
                  ['Department', candidate.department || '—'],
                  ['Reporting to', '[Line Manager Name & Designation]'],
                  ['Date of Joining', '[To be confirmed]'],
                  ['Probation Period', '6 months (extendable)'],
                  ['Gross Salary', '[As per offer discussion]'],
                  ['Work Hours', 'As per company policy'],
                  ['Leave Entitlement', 'As per DBL Group HR Policy'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-slate-100">
                    <td className="py-1.5 pr-4 font-semibold text-slate-600 w-[180px] align-top">{label}</td>
                    <td className="py-1.5 text-slate-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mb-3">
              This offer is subject to satisfactory completion of all pre-employment
              requirements including background verification, medical clearance, and
              submission of all required joining documents.
            </p>

            <p className="mb-3">
              Kindly confirm your acceptance of this offer by signing and returning a copy
              of this letter within <strong>7 working days</strong> of receipt.
            </p>

            <p className="mb-8">
              We look forward to welcoming you to the DBL Group family and wish you a
              rewarding career with us.
            </p>

            <p className="mb-1">Yours sincerely,</p>

            {/* Signature block */}
            <div className="mt-12 flex items-start gap-16">
              <div>
                <div className="mb-1 h-px w-44 bg-slate-400" />
                <p className="text-[11px] font-semibold">Head of Human Resources</p>
                <p className="text-[11px] text-slate-500">DBL Group</p>
              </div>
              <div>
                <div className="mb-1 h-px w-44 bg-slate-400" />
                <p className="text-[11px] font-semibold">Candidate&rsquo;s Acceptance</p>
                <p className="text-[11px] text-slate-500">Date: _______________</p>
              </div>
            </div>

            <p className="mt-10 text-[10px] text-slate-400 border-t border-slate-100 pt-3">
              This is a system-generated draft offer letter. Please review and customise before issuing.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
