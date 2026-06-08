import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, Button } from '@shared/components/ui';
import { useAuth, useAuthStore, authApi } from '@modules/auth';

const MAX_BYTES = 2 * 1024 * 1024;

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function AvatarUploader() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const onPick = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const { avatarUrl } = await authApi.uploadAvatar(file);
      updateUser({ avatarUrl });
      toast.success('Profile picture updated');
    } catch (e) {
      toast.error(errMsg(e, 'Could not upload the picture'));
    } finally {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(localUrl);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await authApi.deleteAvatar();
      updateUser({ avatarUrl: null });
      toast.success('Profile picture removed');
    } catch (e) {
      toast.error(errMsg(e, 'Could not remove the picture'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar
          name={user?.name ?? 'User'}
          src={preview ?? user?.avatarUrl}
          size="lg"
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          </span>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Camera className="h-4 w-4" />}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {user?.avatarUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {user?.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={onRemove}
              disabled={busy}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          JPG, PNG or WebP, up to 2 MB. Stored securely on Google Drive.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
