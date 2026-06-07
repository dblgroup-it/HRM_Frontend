import { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';

import { Button, Input, Modal, Textarea } from '@shared/components/ui';

import { useCreateCandidate } from '../hooks/useCandidates';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

export function AddCandidateModal({
  reqId,
  open,
  onClose,
}: {
  reqId: string;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateCandidate(reqId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cv, setCv] = useState<File | null>(null);

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setCv(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (name.trim().length < 2) return;
    create.mutate(
      {
        input: {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        cv: cv ?? undefined,
      },
      { onSuccess: close },
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add candidate"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            isLoading={create.isPending}
            disabled={name.trim().length < 2}
          >
            Add candidate
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Md. Rofiqul Islam"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional — source, referral, first impression…"
          rows={2}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">CV (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => setCv(e.target.files?.[0] ?? null)}
          />
          {cv ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 truncate text-slate-700">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{cv.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setCv(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Paperclip className="h-4 w-4" />}
              onClick={() => fileRef.current?.click()}
            >
              Attach CV
            </Button>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            Stored in this requisition&rsquo;s “All CVs” Drive folder.
          </p>
        </div>
      </div>
    </Modal>
  );
}
