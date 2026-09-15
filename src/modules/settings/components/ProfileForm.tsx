import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PenLine, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api/fileUrl';
import { useAuth } from '@modules/auth';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@modules/auth/store/auth.store';

import { profileSchema, type ProfileFormValues } from '../schemas/profile.schema';
import { SignatureCropper } from './SignatureCropper';

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export function ProfileForm() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);

  /**
   * The signature is part of this form, not a control that acts on its own.
   *
   * Choosing an image stages it; nothing reaches the server until Save changes.
   * Uploading on selection would leave the page with two ways to commit a
   * change and a Save button that did not cover everything above it.
   */
  const [pending, setPending] = useState<File | null>(null);
  const [clear, setClear] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => (pending ? URL.createObjectURL(pending) : null),
    [pending],
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await authApi.updateProfile(values);
      updateUser({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      });

      // Details first: if the image upload fails, the typed corrections are
      // already saved and the staged image is still here to retry.
      if (pending) {
        const result = await authApi.uploadSignature(pending);
        updateUser(result);
        setPending(null);
      } else if (clear) {
        const result = await authApi.deleteSignature();
        updateUser(result);
        setClear(false);
      }

      toast.success('Profile updated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update profile',
      );
    }
  });

  const shownSignature = clear ? null : user?.signatureUrl;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {user?.jobTitle && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Job title</p>
          <p className="text-sm text-slate-700">{user.jobTitle}</p>
          <p className="mt-0.5 text-xs text-slate-400">Synced from ZingHR — contact IT to update.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
      </div>

      {/* E-signature — staged here, written by Save changes below. */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-sm font-semibold text-slate-800">E-signature</p>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">
          Used on letters and approval sheets issued in your name.
        </p>

        {cropFile ? (
          <SignatureCropper
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onCropped={(cropped) => {
              setPending(cropped);
              setClear(false);
              setCropFile(null);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex aspect-[3/1] w-64 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {preview ? (
                <img src={preview} alt="New signature" className="h-full w-full object-contain" />
              ) : shownSignature ? (
                <img
                  src={resolveApiFileUrl(shownSignature)}
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

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  onClick={() => fileRef.current?.click()}
                >
                  {shownSignature || pending ? 'Choose new image' : 'Upload signature'}
                </Button>
                {(shownSignature || pending) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPending(null);
                      setClear(Boolean(user?.signatureUrl));
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="max-w-xs text-xs text-slate-500">
                PNG or JPEG, up to 2 MB. You will crop it to 3:1, and it is
                applied when you press Save changes.
              </p>
              {(pending || clear) && (
                <p className="text-xs font-medium text-brand-700">
                  {pending
                    ? 'New signature ready — press Save changes to apply it.'
                    : 'Signature will be removed when you press Save changes.'}
                </p>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > MAX_SIGNATURE_BYTES) {
                toast.error('Image must be 2 MB or smaller');
              } else {
                setCropFile(file);
              }
            }
            e.target.value = '';
          }}
        />
      </div>

      <Button type="submit" isLoading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}
