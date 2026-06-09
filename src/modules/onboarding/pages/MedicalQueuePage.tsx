import { useState } from 'react';
import { Check, MapPin, Stethoscope, X } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from '@shared/components/ui';

import { useMedicalQueue, useSetMedical } from '../hooks/useOnboarding';
import type { MedicalQueueItem } from '../types/onboarding.types';

export default function MedicalQueuePage() {
  const { data: queue = [], isLoading, isError } = useMedicalQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Clearance"
        description="New hires awaiting your medical sign-off before joining."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Not available"
          description="Only a medical officer or super user can view this queue."
        />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="All clear"
          description="No candidates are awaiting medical clearance right now."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queue.map((item) => (
            <MedicalCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MedicalCard({ item }: { item: MedicalQueueItem }) {
  const setMedical = useSetMedical();
  const [note, setNote] = useState('');

  const act = (status: 'cleared' | 'rejected') =>
    setMedical.mutate({ onboardingId: item.id, status, note: note || undefined });

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800">{item.candidate.name}</p>
            <p className="text-sm text-slate-500">
              {item.candidate.designation}
            </p>
          </div>
          <Badge tone="warning">Pending</Badge>
        </div>

        <div className="space-y-1 text-xs text-slate-500">
          <p>{item.candidate.unit}</p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {item.candidate.location}
          </p>
          {item.candidate.email && <p>{item.candidate.email}</p>}
        </div>

        <Input
          placeholder="Note (optional) — e.g. fit to join"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            fullWidth
            isLoading={setMedical.isPending}
            leftIcon={<Check className="h-4 w-4" />}
            onClick={() => act('cleared')}
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="outline"
            isLoading={setMedical.isPending}
            leftIcon={<X className="h-4 w-4" />}
            onClick={() => act('rejected')}
          >
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
