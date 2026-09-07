import { useEffect, useState } from 'react';

import { Button, Input, Modal, Select } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useGradeValues } from '@modules/organogram';

import type { ConfigPosition, SeatCategory } from '../types/unit.types';
import { useUpdatePosition, useUpsertPosition } from '../hooks/useUnits';

const CATEGORY_OPTIONS = [
  { value: 'OFFICER', label: 'Officer' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'WORKER', label: 'Worker' },
];

/** Small caps label that groups related fields without adding chrome. */
function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

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
  const { data: gradeValues } = useGradeValues();

  const [section, setSection] = useState('');
  const [designation, setDesignation] = useState('');
  const [category, setCategory] = useState<SeatCategory>('OFFICER');
  const [grade, setGrade] = useState('');
  const [sanctioned, setSanctioned] = useState('1');
  const [filled, setFilled] = useState('0');

  useEffect(() => {
    if (!open) return;
    setSection(position?.section ?? '');
    setDesignation(position?.designation ?? '');
    setCategory(position?.category ?? 'OFFICER');
    setGrade(position?.grade ?? '');
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
      grade: grade.trim() || undefined,
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
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            isLoading={busy}
            disabled={designation.trim().length < 2}
            className="transition-transform duration-150 active:scale-[0.98]"
          >
            {editing ? 'Save changes' : 'Add seat'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FieldGroup title="Placement">
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
        </FieldGroup>

        <FieldGroup title="Classification">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value as SeatCategory)}
            />
            <div>
              <Input
                label="Grade"
                list="seat-grade-suggestions"
                placeholder="e.g. M4"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
              <datalist id="seat-grade-suggestions">
                {(gradeValues ?? []).map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          </div>
        </FieldGroup>

        <FieldGroup title="Headcount">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5">
            <span className="text-xs leading-5 text-slate-500">
              Vacant is derived automatically (sanctioned − filled).
            </span>
            <span
              className={cn(
                'shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums',
                vacant > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {vacant} vacant
            </span>
          </div>
        </FieldGroup>
      </div>
    </Modal>
  );
}
