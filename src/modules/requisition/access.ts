/** Minimal shape of the /me/permissions payload we rely on. */
export interface RequisitionPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/**
 * Who may open a new requisition: a Requisition Raiser (for the unit they hold
 * it in), or a super user. Mirrors `ensureCanRaise` on the backend — holding
 * any other unit-scoped role is deliberately not enough.
 *
 * Pass `unitName` to ask about a specific unit; omit it for "can they raise
 * anywhere?", which is what gates the New requisition button.
 */
export function canRaiseRequisition(
  perms: RequisitionPerms | undefined | null,
  unitName?: string,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  const unit = unitName?.toLowerCase();
  return (perms.roles ?? []).some(
    (r) =>
      r.key === 'requisition_raiser' &&
      (!unit ||
        r.unitId === null ||
        (r.unitName ?? '').toLowerCase() === unit),
  );
}
