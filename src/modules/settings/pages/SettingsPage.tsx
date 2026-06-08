import { useState } from 'react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import { ProfileForm } from '../components/ProfileForm';
import { AvatarUploader } from '../components/AvatarUploader';

type Tab = 'profile' | 'notifications' | 'security';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
];

const NOTIFICATION_PREFS = [
  { key: 'leave', label: 'Leave requests', desc: 'When an employee applies for leave', on: true },
  { key: 'payroll', label: 'Payroll runs', desc: 'When a payroll cycle completes', on: true },
  { key: 'hiring', label: 'New applicants', desc: 'When a candidate applies to an open role', on: false },
  { key: 'reports', label: 'Weekly reports', desc: 'Summary of HR activity each Monday', on: true },
];

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

      {tab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100">
            {NOTIFICATION_PREFS.map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {pref.label}
                  </p>
                  <p className="text-xs text-slate-400">{pref.desc}</p>
                </div>
                <Toggle defaultOn={pref.on} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-800">Password</p>
                <p className="text-xs text-slate-400">
                  Last changed 3 months ago
                </p>
              </div>
              <Button variant="outline" size="sm">
                Change password
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Two-factor authentication
                </p>
                <p className="text-xs text-slate-400">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Toggle defaultOn={false} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        on ? 'bg-brand-600' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
