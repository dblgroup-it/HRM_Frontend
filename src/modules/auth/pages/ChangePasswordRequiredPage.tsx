import { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input } from '@shared/components/ui';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import { useAuthStore } from '../store/auth.store';

/** Mirror the backend defaults (PASSWORD_MIN/MAX_LENGTH); the server has the final say. */
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 12;

/**
 * Shown instead of the app while the account still holds a password it did not
 * choose.
 *
 * This is not only a UI redirect — the backend refuses every other endpoint for
 * such a session (FirstLoginGuard), so there is nothing useful behind it
 * anyway. The screen exists so the user is told why, rather than meeting a
 * wall of permission errors.
 */
export function ChangePasswordRequiredPage() {
  const user = useAuthStore((s) => s.user);
  const passwordChanged = useAuthStore((s) => s.passwordChanged);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const badLength =
    newPassword.length > 0 &&
    (newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH);
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const ready =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length <= MAX_PASSWORD_LENGTH &&
    confirm === newPassword &&
    !busy;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      // Every existing session is invalidated by the change, so the backend
      // hands back a replacement token for this one.
      const res = await http.post<ApiResponse<{ ok: true; token: string }>>(
        '/auth/change-password',
        { currentPassword, newPassword },
      );
      passwordChanged(res.data.token);
      toast.success('Password changed — welcome to DBL HRM.');
    } catch (err) {
      // The API's errors are plain { message } objects, not Error instances —
      // checking for Error hid every reason ("cannot contain your employee
      // code", "current password is incorrect") behind one generic line.
      const message =
        (err as { message?: string } | null)?.message ||
        'Could not change your password.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-amber-50 p-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">
              Choose your password
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {user?.name ? `${user.name}, your` : 'Your'} account is still using
              the temporary password it was set up with. Please choose your own
              before continuing.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Current password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrentPassword(e.target.value)
              }
              placeholder="The password you just signed in with"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">New password</span>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPassword(e.target.value)
              }
              maxLength={MAX_PASSWORD_LENGTH}
              placeholder={`${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`}
            />
            <span
              className={
                badLength ? 'text-xs text-red-600' : 'text-xs text-slate-500'
              }
            >
              {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters. It
              cannot be or contain your employee code.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">
              Confirm new password
            </span>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirm(e.target.value)
              }
            />
            {mismatch && (
              <span className="text-xs text-red-600">
                The two passwords do not match.
              </span>
            )}
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={!ready} className="mt-1 w-full">
            <KeyRound className="mr-2 h-4 w-4" />
            {busy ? 'Saving…' : 'Set password and continue'}
          </Button>

          <button
            type="button"
            onClick={clearSession}
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
