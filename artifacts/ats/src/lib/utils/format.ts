import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  shortlisted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  technical_interview: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  hr_interview: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  offer: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  hired: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  technical_interview: 'Technical Interview',
  hr_interview: 'HR Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export function getMatchScoreColor(score: number) {
  if (score < 50) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
  if (score < 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
}
