import { Files, Plus, UserPlus } from 'lucide-react';

import { GlassToolbarPrimary } from '@shared/components/ui';

import { ToolbarMenu } from './ToolbarMenu';

/**
 * "Add candidate" as a menu: one person, or a stack of CVs at once.
 *
 * Bulk upload used to be its own button further along the toolbar, where it
 * read as a different kind of action rather than another way of doing this
 * one.
 */
export function AddCandidateMenu({
  onSingle,
  onBulk,
}: {
  onSingle: () => void;
  onBulk: () => void;
}) {
  return (
    <ToolbarMenu
      label="Add candidate"
      trigger={({ open, toggle }) => (
        <GlassToolbarPrimary
          icon={<Plus />}
          compactLabel="Add"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
        >
          Add candidate
        </GlassToolbarPrimary>
      )}
      items={[
        {
          key: 'single',
          icon: <UserPlus />,
          tone: 'bg-brand-600',
          title: 'Single candidate',
          hint: 'One person — CV, source and referral',
          onSelect: onSingle,
        },
        {
          key: 'bulk',
          icon: <Files />,
          tone: 'bg-emerald-600',
          title: 'Bulk CV upload',
          hint: 'Up to 30 PDFs at once, one source',
          onSelect: onBulk,
        },
      ]}
    />
  );
}
