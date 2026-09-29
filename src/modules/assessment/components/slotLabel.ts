const TZ = 'Asia/Dhaka';

/** "Thu, 1 Oct 2026 · 11:30 AM", in Dhaka time. */
export function slotLabel(iso: string | null): string {
  if (!iso) return 'no time set';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}
