export const TYPE_COLORS: Record<string, { hex: string; bg: string; text: string; border: string }> = {
  'PCR': {
    hex: '#0284c7', // Sky-600
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800',
  },
  'PCR PHOTOS ONLY': {
    hex: '#0d9488', // Teal-600
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-800',
  },
  'INVENTORY': {
    hex: '#6366f1', // Indigo-500
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-800',
  },
  'FINAL BOND': {
    hex: '#f59e0b', // Amber-500
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
  },
  'ROUTINE': {
    hex: '#9333ea', // Purple-600
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800',
  },
  'COMMERCIAL': {
    hex: '#e11d48', // Rose-600
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
  },
};

export const FALLBACK_TYPE_COLOR = {
  hex: '#64748b',
  bg: 'bg-slate-50 dark:bg-slate-900',
  text: 'text-slate-700 dark:text-slate-300',
  border: 'border-slate-300 dark:border-slate-700',
};

export function getTypeColor(type: string) {
  const norm = type.trim().toUpperCase();
  return TYPE_COLORS[norm] || FALLBACK_TYPE_COLOR;
}

export const WEEKDAYS = [
  { id: 1, name: 'Mon', fullName: 'Monday' },
  { id: 2, name: 'Tue', fullName: 'Tuesday' },
  { id: 3, name: 'Wed', fullName: 'Wednesday' },
  { id: 4, name: 'Thu', fullName: 'Thursday' },
  { id: 5, name: 'Fri', fullName: 'Friday' },
  { id: 6, name: 'Sat', fullName: 'Saturday' },
  { id: 0, name: 'Sun', fullName: 'Sunday' },
];

export const CHART_PALETTE = [
  '#0284c7',
  '#0d9488',
  '#6366f1',
  '#f59e0b',
  '#9333ea',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#06b6d4',
  '#8b5cf6',
];
