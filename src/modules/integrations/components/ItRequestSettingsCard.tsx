import { useEffect, useState } from 'react';
import { Mail, Save } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Spinner,
} from '@shared/components/ui';
import {
  useItRequestSettings,
  useSaveItRequestSettings,
} from '@modules/onboarding';

const PLATFORMS = ['Google', 'Microsoft 365'];

/**
 * Where "Notify IT" — onboarding's last step — sends the request for a new
 * hire's work email, and how the email opens. IT's mailbox changes, so it is
 * set here rather than on the server.
 */
export function ItRequestSettingsCard() {
  const { data, isLoading } = useItRequestSettings();
  const save = useSaveItRequestSettings();
  const [recipients, setRecipients] = useState('');
  const [salutation, setSalutation] = useState('');
  const [platform, setPlatform] = useState('Google');

  useEffect(() => {
    if (!data) return;
    setRecipients(data.recipients.join(', '));
    setSalutation(data.salutation);
    setPlatform(data.platform);
  }, [data]);

  if (isLoading || !data) {
    return (
      <Card>
        <CardBody className="flex justify-center py-10">
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  const dirty =
    recipients.trim() !== data.recipients.join(', ') ||
    salutation.trim() !== data.salutation ||
    platform !== data.platform;
  const options = [...new Set([data.platform, ...PLATFORMS])].map((p) => ({
    value: p,
    label: p,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-600" />
          IT account requests
        </CardTitle>
        <span className="text-xs text-slate-400">Used by Notify IT on onboarding</span>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">
          When a hire is ready, HR selects <span className="font-medium text-slate-700">Notify IT</span>{' '}
          and the request for their work email — and, for a replacement, the deletion of the
          leaver&rsquo;s — goes to the address below. IT confirms from the link in it.
        </p>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          <Input
            label="Send requests to"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="hr-lt-req@dbl-group.com"
            hint="One or more addresses, separated by commas."
          />
          <Input
            label="Address IT as"
            value={salutation}
            onChange={(e) => setSalutation(e.target.value)}
            placeholder="IT Team"
            hint={`The email opens “Dear ${salutation.trim() || 'IT Team'},”`}
          />
          <Select
            label="Default email platform"
            options={options}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={save.isPending}
            disabled={!dirty || !recipients.trim()}
            onClick={() =>
              save.mutate({
                recipients: recipients.trim(),
                salutation: salutation.trim() || undefined,
                platform,
              })
            }
          >
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
