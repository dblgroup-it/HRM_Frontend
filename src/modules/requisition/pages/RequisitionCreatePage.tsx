import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { PageHeader } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';

import { RequisitionForm } from '../components/RequisitionForm';
import { useCreateRequisition } from '../hooks/useRequisitions';

export default function RequisitionCreatePage() {
  const navigate = useNavigate();
  const create = useCreateRequisition();

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
        isSubmitting={create.isPending}
        onCancel={() => navigate(ROUTES.requisitions)}
        onSubmit={(payload) =>
          create.mutate(payload, {
            onSuccess: (created) =>
              navigate(ROUTES.requisitionDetail(created.id)),
          })
        }
      />
    </div>
  );
}
