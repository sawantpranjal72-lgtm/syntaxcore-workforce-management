export const IST_TIMEZONE = 'Asia/Kolkata';

export function formatISTDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, day:'numeric', month:'short', year:'numeric' });
}

export function formatISTDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { timeZone: IST_TIMEZONE, day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
}

export function getISTGreeting(): string {
  const hour = new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE, hour:'numeric', hour12:false });
  const h = parseInt(hour);
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}
