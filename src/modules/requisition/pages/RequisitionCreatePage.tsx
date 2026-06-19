import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { BusyOverlay, PageHeader } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';

import { RequisitionForm } from '../components/RequisitionForm';
import { useCreateRequisition } from '../hooks/useRequisitions';
import { requisitionApi } from '../api/requisition.api';
import type { CreateRequisitionPayload } from '../types/requisition.types';

export default function RequisitionCreatePage() {
  const navigate = useNavigate();
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

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.requisitions}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requisitions
      </Link>

      <PageHeader
        title="New Manpower Requisition"
        description="Step 1 · Capture the role, authority and facilities before HR approval."
      />

      {create.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
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
