export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// "18:00" -> "6:00 PM"
export function formatScheduledTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatTime(d);
}

// "Sat, Sep 26"
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// Today -> "8:04 AM", yesterday -> "Yesterday", this week -> "Fri", older -> "Oct 3"
export function formatRelativeDay(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days === 0) return formatTime(date);
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysLeft(end: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((startOfDay(end).getTime() - startOfDay(now).getTime()) / 86_400_000));
}

const PAST_TENSE: Record<string, string> = {
  Feed: 'Fed',
  Walk: 'Walked',
  Play: 'Played',
  Train: 'Trained',
  Groom: 'Groomed',
};

export function activityLabel(activityType: string): string {
  return PAST_TENSE[activityType] ?? activityType;
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
