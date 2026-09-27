export interface PanelEntry {
  userId: string;
  name: string;
  /** Sits on this panel for HR — fills the facilities on the evaluation form. */
  hr: boolean;
}

/** The panel's state handlers, the same on every scheduling screen. */
export function panelHandlers(setPanel: (fn: (prev: PanelEntry[]) => PanelEntry[]) => void) {
  return {
    add: (userId: string, name: string, hr: boolean) =>
      setPanel((prev) =>
        prev.some((p) => p.userId === userId)
          ? prev.map((p) => (p.userId === userId ? { ...p, hr } : p))
          : [...prev, { userId, name, hr }],
      ),
    remove: (userId: string) => setPanel((prev) => prev.filter((p) => p.userId !== userId)),
    move: (userId: string, hr: boolean) =>
      setPanel((prev) => prev.map((p) => (p.userId === userId ? { ...p, hr } : p))),
  };
}

/** What the schedule request carries. */
export function panelPayload(panel: PanelEntry[]) {
  return {
    panelistUserIds: panel.map((p) => p.userId),
    hrPanelistUserIds: panel.filter((p) => p.hr).map((p) => p.userId),
  };
}
