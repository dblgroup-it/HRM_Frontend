import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

import {
  BusyOverlay,
  EmptyState,
  FullPageSpinner,
  PageHeader,
} from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { useMyPermissions } from '@modules/rbac';

import { RequisitionForm } from '../components/RequisitionForm';
import { useCreateRequisition } from '../hooks/useRequisitions';
import { requisitionApi } from '../api/requisition.api';
import type { CreateRequisitionPayload } from '../types/requisition.types';
import { canRaiseRequisition } from '../access';

export default function RequisitionCreatePage() {
  const navigate = useNavigate();
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const create = useCreateRequisition();
  // `submitting` stays true for the WHOLE flow (create → upload attachments →
  // navigate). The ref blocks a second submit synchronously, so rapid double-
  // clicks can't create duplicate requisitions.
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);

  const handleSubmit = (
    payload: CreateRequisitionPayload,
    attachments: File[],
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const startedAt = Date.now();
    setSubmitting(true);
    create.mutate(payload, {
      onSuccess: async (created) => {
        for (const file of attachments) {
          try {
            await requisitionApi.uploadAttachment(created.id, file);
          } catch {
            /* best-effort — the requisition is already created */
          }
        }
        // Hold the loader for at least 1 s so the overlay is actually visible
        const remaining = 1000 - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        navigate(ROUTES.requisitionDetail(created.id));
      },
      onError: () => {
        busyRef.current = false;
        setSubmitting(false);
      },
    });
  };

  if (permsLoading) return <FullPageSpinner label="Loading…" />;

  if (!canRaiseRequisition(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Manpower Requisition" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="You can't raise requisitions"
          description="Only a Requisition Raiser for a unit (or a super user) can open one. Ask Corporate HR to add you in Configuration → Approval Paths."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.requisitions}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requisitions
      </Link>

      <div className="animate-rise-in">
        <PageHeader
          title="New Manpower Requisition"
          description="Step 1 · Capture the role, authority and facilities before HR approval."
        />
      </div>

      {create.isError && (
        <p className="animate-fade-in rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {(create.error as Error).message}
        </p>
      )}

      <RequisitionForm
        isSubmitting={submitting}
        onCancel={() => navigate(ROUTES.requisitions)}
        onSubmit={handleSubmit}
      />

      <BusyOverlay show={submitting} label="Submitting to sign-off chain…" />
    </div>
  );
}
