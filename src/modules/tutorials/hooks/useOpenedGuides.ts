import { useCallback, useState } from 'react';

import { useAuthStore } from '@modules/auth';

type Opened = Record<string, string>;

const storageKey = (userId: string) => `hrm.tutorials.opened.${userId}`;

function read(userId: string | undefined): Opened {
  if (!userId) return {};
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}');
    return value && typeof value === 'object' ? (value as Opened) : {};
  } catch {
    return {};
  }
}

/**
 * Which guides this person has opened, on this browser. A convenience for the
 * "Opened" ticks — not a record of anything, so storage that is blocked or
 * cleared simply shows none.
 */
export function useOpenedGuides() {
  const raw = useAuthStore((s) => s.user?.id);
  const userId = raw == null ? undefined : String(raw);
  const [opened, setOpened] = useState<Opened>(() => read(userId));

  const markOpened = useCallback(
    (slug: string) => {
      setOpened((prev) => {
        if (prev[slug]) return prev;
        const next = { ...prev, [slug]: new Date().toISOString() };
        try {
          if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(next));
        } catch {
          // Storage unavailable: the tick lasts for this visit only.
        }
        return next;
      });
    },
    [userId],
  );

  return { opened, markOpened };
}
