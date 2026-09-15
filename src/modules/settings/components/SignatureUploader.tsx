import { useRef, useState } from 'react';
import { PenLine, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api/fileUrl';
import { authApi } from '@modules/auth';

import { SignatureCropper } from './SignatureCropper';

/** PNG and JPEG only — see SIGNATURE_MIME on the server for why. */
const ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';
const MAX_BYTES = 2 * 1024 * 1024;

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

/**
 * Upload, replace or remove an e-signature.
 *
 * Serves both callers: a person managing their own from Settings, and HR
 * placing one on an employee's profile. `userId` distinguishes them — omitted
 * means "mine".
 *
 * `locked` renders the read-only case: the person uploaded their own signature,
 * so it is not HR's to change. The server enforces that regardless; showing a
 * disabled control with the reason is better than letting someone crop an image
 * and only then be told no.
 */
export function SignatureUploader({
  signatureUrl,
  userId,
  locked = false,
  lockedReason,
  onChanged,
}: {
  signatureUrl: string | null | undefined;
  /** Omit for your own signature. */
  userId?: string;
  locked?: boolean;
  lockedReason?: string;
  onChanged?: (next: {
    signatureUrl: string | null;
    signatureSelfUploaded: boolean;
  }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = (file?: File | null) => {
    if (!file) return;
    if (!/\.(png|jpe?g)$/i.test(file.name) && !/^image\/(png|jpeg)$/.test(file.type)) {
      toast.error('A signature must be a PNG or JPEG image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    setPicked(file);
  };

  const upload = async (cropped: File) => {
    setBusy(true);
    try {
      const result = await authApi.uploadSignature(cropped, userId);
      onChanged?.(result);
      setPicked(null);
      toast.success('Signature saved');
    } catch (e) {
      toast.error(errMsg(e, 'Could not save the signature'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const result = await authApi.deleteSignature(userId);
      onChanged?.(result);
      toast.success('Signature removed');
    } catch (e) {
      toast.error(errMsg(e, 'Could not remove the signature'));
    } finally {
      setBusy(false);
    }
  };

  if (picked) {
    return (
      <SignatureCropper
        file={picked}
        isUploading={busy}
        onCancel={() => setPicked(null)}
        onCropped={upload}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Always shown at 3:1 so what is stored is what is seen. */}
      <div className="flex aspect-[3/1] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
        {signatureUrl ? (
          <img
            src={resolveApiFileUrl(signatureUrl)}
            alt="E-signature"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-slate-400">
            <PenLine className="h-5 w-5" />
            No signature yet
          </span>
        )}
      </div>

      {locked ? (
        <p className="max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {lockedReason ??
            'This person uploaded their own signature, so it cannot be changed here. Ask them to replace it themselves.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => fileRef.current?.click()}
          >
            {signatureUrl ? 'Replace signature' : 'Upload signature'}
          </Button>
          {signatureUrl && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={remove}
            >
              Remove
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        PNG or JPEG, up to 2 MB. You will be able to crop it to 3:1 before it is
        saved.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
