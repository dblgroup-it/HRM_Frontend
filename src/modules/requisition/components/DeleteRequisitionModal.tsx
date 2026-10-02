import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input, Modal } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';

import { requisitionApi } from '../api/requisition.api';
import { requisitionKeys } from '../hooks/useRequisitions';
import type { Requisition } from '../types/requisition.types';

/**
 * Permanently delete a requisition — the ADMIN account's tool for clearing a
 * test or mistaken requisition. Everything under it goes: the approval chain,
 * candidates, interviews and marks, salary fixation, board approval,
 * onboarding and its notifications. The code has to be typed back, because
 * there is no undo.
 */
export function DeleteRequisitionModal({
  requisition: req,
  open,
  onClose,
}: {
  requisition: Requisition;
  open: boolean;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const matches = typed.trim().toUpperCase() === req.code.toUpperCase();

  const remove = useMutation({
    mutationFn: () => requisitionApi.remove(req.id, typed.trim()),
    onSuccess: (r) => {
      toast.success(
        `${r.code} deleted — ${r.candidates} candidate${r.candidates === 1 ? '' : 's'} and ${r.notifications} notification${r.notifications === 1 ? '' : 's'} removed`,
      );
      qc.removeQueries({ queryKey: requisitionKeys.detail(req.id) });
      void qc.invalidateQueries();
      navigate(ROUTES.requisitions, { replace: true });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const close = () => {
    setTyped('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={`Delete ${req.code}`}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!matches}
            isLoading={remove.isPending}
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => remove.mutate()}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This erases <strong>{req.designationLabel || req.designation}</strong>{' '}
            and everything under it — approvals, candidates, interviews and
            marks, salary, board approval, onboarding and their notifications.
            It cannot be undone. Files already on Google Drive are kept.
          </span>
        </p>
        <Input
          label={`Type ${req.code} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={req.code}
          autoComplete="off"
        />
      </div>
    </Modal>
  );
}
