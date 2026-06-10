import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  PageHeader,
  SegmentedToggle,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import { ProfileForm } from '../components/ProfileForm';
import { AvatarUploader } from '../components/AvatarUploader';
import { TwoFactorSection } from '../components/TwoFactorSection';

type Tab = 'profile' | 'notifications' | 'security';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
];

interface Preferences {
  emailNotifications: boolean;
  hasEmail: boolean;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and security."
      />

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <AvatarUploader />
            <ProfileForm />
          </CardBody>
        </Card>
      )}

      {tab === 'notifications' && <NotificationsTab />}

      {tab === 'security' && <SecurityTab />}
    </div>
  );
}

function NotificationsTab() {
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: () =>
      http
        .get<ApiResponse<Preferences>>('/users/me/preferences')
        .then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: (emailNotifications: boolean) =>
      http
        .patch<ApiResponse<{ emailNotifications: boolean }>>(
          '/users/me/preferences',
          { emailNotifications },
        )
        .then((r) => r.data),
    onSuccess: (d) => {
      qc.setQueryData<Preferences>(['me', 'preferences'], (old) =>
        old ? { ...old, emailNotifications: d.emailNotifications } : old,
      );
      toast.success(
        d.emailNotifications
          ? 'Email notifications turned on'
          : 'Email notifications turned off',
      );
    },
    onError: () => toast.error('Could not update your preference'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Email notifications
                  </p>
                  <p className="text-xs text-slate-400">
                    Also send my in-app notifications (approvals, candidates,
                    onboarding, etc.) to my email.
                  </p>
                </div>
              </div>
              <SegmentedToggle
                value={prefs?.emailNotifications ?? false}
                disabled={update.isPending || !prefs?.hasEmail}
                onChange={(v) => update.mutate(v)}
              />
            </div>
            {prefs && !prefs.hasEmail && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Add an email address to your profile to receive email
                notifications.
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function SecurityTab() {
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Password */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800">Password</p>
              <p className="text-xs text-slate-400">
                Change the password you use to sign in.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
            Change password
          </Button>
        </div>

        {/* Two-factor authentication */}
        <TwoFactorSection />
      </CardBody>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </Card>
  );
}

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const change = useMutation({
    mutationFn: () =>
      http
        .post<ApiResponse<{ ok: boolean }>>('/auth/change-password', {
          currentPassword: current,
          newPassword: next,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('Password changed');
      reset();
      onClose();
    },
    onError: (e) => setError((e as Error).message || 'Could not change password'),
  });

  const submit = () => {
    setError('');
    if (next.length < 6)
      return setError('New password must be at least 6 characters.');
    if (next !== confirm) return setError('New passwords do not match.');
    change.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Change password" size="sm">
      <div className="space-y-3">
        <Input
          type="password"
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          type="password"
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            isLoading={change.isPending}
            disabled={!current || !next || !confirm}
          >
            Update password
          </Button>
        </div>
      </div>
    </Modal>
  );
}
