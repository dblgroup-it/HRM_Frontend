import { useEffect, useState } from 'react';

import { Button, Input, Modal, Select } from '@shared/components/ui';

import type { ConfigPosition, SeatCategory } from '../types/unit.types';
import { useUpdatePosition, useUpsertPosition } from '../hooks/useUnits';

const CATEGORY_OPTIONS = [
  { value: 'OFFICER', label: 'Officer' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'WORKER', label: 'Worker' },
];

export function SeatFormModal({
  open,
  onClose,
  departmentId,
  departmentName,
  position,
  sectionSuggestions,
}: {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
  position?: ConfigPosition | null;
  sectionSuggestions: string[];
}) {
  const upsert = useUpsertPosition();
  const update = useUpdatePosition();
  const editing = Boolean(position);

  const [section, setSection] = useState('');
  const [designation, setDesignation] = useState('');
  const [category, setCategory] = useState<SeatCategory>('OFFICER');
  const [sanctioned, setSanctioned] = useState('1');
  const [filled, setFilled] = useState('0');

  useEffect(() => {
    if (!open) return;
    setSection(position?.section ?? '');
    setDesignation(position?.designation ?? '');
    setCategory(position?.category ?? 'OFFICER');
    setSanctioned(String(position?.sanctioned ?? 1));
    setFilled(String(position?.filled ?? 0));
  }, [open, position]);

  const busy = upsert.isPending || update.isPending;
  const vacant = Math.max(0, (Number(sanctioned) || 0) - (Number(filled) || 0));

  const save = () => {
    if (designation.trim().length < 2) return;
    const input = {
      designation: designation.trim(),
      section: section.trim() || undefined,
      category,
      sanctioned: Number(sanctioned) || 0,
      filled: Number(filled) || 0,
    };
    if (position) {
      update.mutate({ id: position.id, input }, { onSuccess: onClose });
    } else {
      upsert.mutate({ departmentId, input }, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit seat' : `Add seat · ${departmentName}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            isLoading={busy}
            disabled={designation.trim().length < 2}
          >
            {editing ? 'Save changes' : 'Add seat'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Input
            label="Section"
            list="seat-section-suggestions"
            placeholder="e.g. IT Support (optional)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <datalist id="seat-section-suggestions">
            {sectionSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <Input
          label="Designation"
          placeholder="e.g. System Engineer"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value as SeatCategory)}
          />
          <Input
            label="Sanctioned"
            type="number"
            min={0}
            value={sanctioned}
            onChange={(e) => setSanctioned(e.target.value)}
          />
          <Input
            label="Filled"
            type="number"
            min={0}
            value={filled}
            onChange={(e) => setFilled(e.target.value)}
          />
        </div>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Vacant is derived automatically:{' '}
          <span className="font-semibold text-slate-700">
            {vacant} vacant
          </span>{' '}
          (sanctioned − filled).
        </p>
      </div>
    </Modal>
  );
}
