import { useState } from 'react';
import { Plus, Trash2, UserPlus, Users, X } from 'lucide-react';

import {
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  FullPageSpinner,
  Modal,
  PageHeader,
} from '@shared/components/ui';
import { useEmployees } from '@modules/employees';

import {
  useAddBoardMembers,
  useBoardGroups,
  useCreateBoardGroup,
  useDeleteBoardGroup,
  useRemoveBoardMember,
  useUpdateBoardGroup,
} from '../hooks/useBoard';

/* ─── Create / Edit group modal ─── */
function GroupFormModal({
  initial,
  onClose,
}: {
  initial?: { id: string; name: string; description: string | null };
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const create = useCreateBoardGroup();
  const update = useUpdateBoardGroup();
  const busy = create.isPending || update.isPending;

  const submit = () => {
    if (!name.trim()) return;
    if (initial) {
      update.mutate({ id: initial.id, name: name.trim(), description: desc.trim() || undefined }, { onSuccess: onClose });
    } else {
      create.mutate({ name: name.trim(), description: desc.trim() || undefined }, { onSuccess: onClose });
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Board Group' : 'New Board Group'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">Group name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Executive Committee"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">Description (optional)</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
            placeholder="Brief description of this board group…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!name.trim() || busy} isLoading={busy} onClick={submit}>
            {initial ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add members modal ─── */
function AddMembersModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: groups = [] } = useBoardGroups();
  const { data: empData } = useEmployees({ search, pageSize: 40 });
  const add = useAddBoardMembers();

  const group = groups.find((g) => g.id === groupId);
  const existingIds = new Set(group?.members.map((m) => m.userId) ?? []);

  const employees = (empData?.items ?? []).filter((e) => e.userId && !existingIds.has(e.userId));

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(userId)) n.delete(userId);
      else n.add(userId);
      return n;
    });

  return (
    <Modal open onClose={onClose} title="Add Board Members" size="md">
      <div className="space-y-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees by name or designation…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />

        <div className="max-h-60 space-y-1 overflow-y-auto pr-0.5">
          {employees.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No employees found.</p>
          )}
          {employees.map((e) => (
            <label key={e.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(e.userId!)}
                onChange={() => toggle(e.userId!)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <Avatar name={e.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.75rem] font-medium text-slate-800">{e.name}</p>
                <p className="text-[0.625rem] text-slate-400">{[e.jobTitle, e.department].filter(Boolean).join(' · ')}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={selected.size === 0 || add.isPending}
            isLoading={add.isPending}
            onClick={() => add.mutate({ groupId, userIds: [...selected] }, { onSuccess: onClose })}>
            Add {selected.size > 0 ? `${selected.size} Member${selected.size !== 1 ? 's' : ''}` : 'Members'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Page ─── */
export default function BoardGroupsPage() {
  const { data: groups = [], isLoading } = useBoardGroups();
  const deleteGroup = useDeleteBoardGroup();
  const removeMember = useRemoveBoardMember();

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [addMembersGroupId, setAddMembersGroupId] = useState<string | null>(null);

  if (isLoading) return <FullPageSpinner label="Loading board groups…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board Groups"
        description="Configure named groups of board members for candidate approval workflows."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Group
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-slate-300" />}
          title="No board groups yet"
          description="Create a group and add employees who will receive board approval emails for onboarding candidates."
          action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create first group</Button>}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardBody className="p-0">
                {/* Group header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                      <Users className="h-4.5 w-4.5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-[0.875rem] font-semibold text-slate-800">{group.name}</p>
                      {group.description && <p className="text-[0.75rem] text-slate-500">{group.description}</p>}
                      <p className="text-[0.6875rem] text-slate-400">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddMembersGroupId(group.id)}>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Add Members
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditGroup(group)}>Edit</Button>
                    <Button variant="ghost" size="sm"
                      onClick={() => { if (confirm(`Delete "${group.name}"?`)) deleteGroup.mutate(group.id); }}
                      className="text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Members */}
                {group.members.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400">No members yet — add employees to this group.</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {group.members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={m.user.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.8125rem] font-medium text-slate-800">{m.user.name}</p>
                          <p className="text-[0.6875rem] text-slate-400">
                            {[m.user.employee?.designation, m.user.email].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button type="button"
                          onClick={() => removeMember.mutate({ groupId: group.id, userId: m.userId })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <GroupFormModal onClose={() => setShowCreate(false)} />}
      {editGroup && <GroupFormModal initial={editGroup} onClose={() => setEditGroup(null)} />}
      {addMembersGroupId && <AddMembersModal groupId={addMembersGroupId} onClose={() => setAddMembersGroupId(null)} />}
    </div>
  );
}
