import { useState } from 'react';
import { Plus } from 'lucide-react';

import {
  Button,
  EmptyState,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
} from '@shared/components/ui';

import { useCreateUnit, useUnitsConfig } from '../hooks/useUnits';
import { UnitCard } from '../components/UnitCard';

export default function UnitConfigPage() {
  const { data: units, isLoading } = useUnitsConfig();
  const createUnit = useCreateUnit();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    if (name.trim().length < 2) return;
    createUnit.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
          setOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Configuration"
        description="Configure units, departments and sanctioned seats — this drives the organogram."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpen(true)}
          >
            Add unit
          </Button>
        }
      />

      {isLoading ? (
        <FullPageSpinner label="Loading units…" />
      ) : !units || units.length === 0 ? (
        <EmptyState
          title="No units configured"
          description="Add your first unit to start building the organogram."
          action={<Button onClick={() => setOpen(true)}>Add unit</Button>}
        />
      ) : (
        <div className="space-y-4">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add unit"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={createUnit.isPending}
              disabled={name.trim().length < 2}
              onClick={submit}
            >
              Create unit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Unit / Factory name"
            placeholder="e.g. Jinnat Textile Mills Ltd"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {createUnit.isError && (
            <p className="text-sm text-red-600">
              {(createUnit.error as Error).message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
