import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { candidatesApi } from '../api/candidates.api';

/**
 * The CV of a candidate who never sent one.
 *
 * Bdjobs applications arrive as fields, not a document, so there is no file to
 * open. The server renders the stored profile as HTML and this shows it.
 *
 * Shown in a sandboxed iframe rather than opened in a new tab, for two
 * reasons: the route is JWT-guarded, so a plain link would arrive without a
 * token and 401; and fetching first then calling window.open lands after an
 * await, which browsers block as an unrequested popup. The iframe keeps the
 * document's own styling intact without letting it touch the app around it.
 */
export function GeneratedCvModal({
  candidateId,
  candidateName,
  open,
  onClose,
}: {
  candidateId: string;
  candidateName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHtml(null);
    setError(null);
    candidatesApi
      .generatedCv(candidateId)
      .then((doc) => {
        if (!cancelled) setHtml(doc);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : 'The CV could not be loaded. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open, candidateId]);

  /** Print the CV itself, not the application around it. */
  const print = () => frameRef.current?.contentWindow?.print();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`${candidateName} — CV`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Generated from the application. Not a CV the candidate wrote.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={print} disabled={!html}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      }
    >
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : html === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          Building the CV…
        </div>
      ) : (
        <iframe
          ref={frameRef}
          title={`${candidateName} — CV`}
          srcDoc={html}
          // allow-same-origin so print() can reach the document; no
          // allow-scripts, because nothing in a CV needs to run.
          sandbox="allow-same-origin allow-modals"
          className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
        />
      )}
    </Modal>
  );
}
