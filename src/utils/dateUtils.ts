import { DatePreset } from '../types';

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns today's date in Australia/Perth timezone as a YYYY-MM-DD string.
 * Uses new Date() and new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Perth' }).
 * Never hardcodes or uses dataset dates.
 */
export function getPerthTodayString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Perth' }).format(new Date());
  } catch {
    const now = new Date();
    // UTC+8 offset fallback for Australia/Perth
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const perthTime = new Date(utc + 3600000 * 8);
    const y = perthTime.getFullYear();
    const m = String(perthTime.getMonth() + 1).padStart(2, '0');
    const d = String(perthTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export interface CalendarDateParts {
  year: number;
  month: number; // 1 to 12
  day: number; // 1 to 31
  dateStr: string; // YYYY-MM-DD
}

export function getPerthTodayParts(): CalendarDateParts {
  const dateStr = getPerthTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d, dateStr };
}

/**
 * Adds or subtracts days from a YYYY-MM-DD plain calendar date string.
 * Anchored at midday (12:00:00) to eliminate any daylight/timezone drift.
 */
export function addDaysToDateStr(baseDateStr: string, daysDelta: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  date.setDate(date.getDate() + daysDelta);
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  const newD = String(date.getDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

/**
 * Formats a YYYY-MM-DD string into a friendly display string (e.g. "Sat 24 Oct 2026").
 */
export function formatPerthDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  return `${dayName} ${d} ${monthName} ${y}`;
}

/**
 * Parses Australian / plain calendar date string without timezone shifts.
 * Handles formats like: "Mon 9 Nov 2026", "Thu 1 Oct 2026", "2026-10-24", "24/10/2026", "09/11/2026".
 */
export function parseCalendarDate(raw: string | undefined | null): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.replace(/[\u00A0\u200B\uFEFF]/g, ' ').trim();
  if (!str) return null;

  // Try standard ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  // Try Australian DD/MM/YYYY
  const auSlashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (auSlashMatch) {
    const day = parseInt(auSlashMatch[1], 10);
    const month = parseInt(auSlashMatch[2], 10) - 1;
    const year = parseInt(auSlashMatch[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  // Try "Mon 9 Nov 2026" or "Thu 1 Oct 2026" or "Monday 9 November 2026"
  const clean = str.replace(/,/g, ' ').replace(/\s+/g, ' ');
  const tokens = clean.split(' ');

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  for (const token of tokens) {
    const tLower = token.toLowerCase();

    // Check month
    if (MONTH_MAP[tLower] !== undefined && month === null) {
      month = MONTH_MAP[tLower];
      continue;
    }

    // Check year (4 digits)
    if (/^\d{4}$/.test(token) && year === null) {
      year = parseInt(token, 10);
      continue;
    }

    // Check day (1-2 digits, maybe 1st, 2nd, etc.)
    const dayDigits = token.replace(/(st|nd|rd|th)$/i, '');
    if (/^\d{1,2}$/.test(dayDigits) && day === null) {
      const dVal = parseInt(dayDigits, 10);
      if (dVal >= 1 && dVal <= 31) {
        day = dVal;
        continue;
      }
    }
  }

  if (year !== null && month !== null && day !== null) {
    return new Date(year, month, day, 12, 0, 0);
  }

  // Fallback to Date.parse
  const fallbackTs = Date.parse(str);
  if (!isNaN(fallbackTs)) {
    const d = new Date(fallbackTs);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  }

  return null;
}

export function formatDateKey(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(date: Date | null): string {
  if (!date) return '';
  const dayName = DAY_NAMES[date.getDay()];
  const d = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const y = date.getFullYear();
  return `${dayName} ${d} ${monthName} ${y}`;
}

export function formatShortDate(date: Date | null): string {
  if (!date) return '';
  const d = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  return `${d} ${monthName}`;
}

/**
 * Computes preset from/to date keys strictly anchored to Perth today.
 *
 * Rules:
 * - Today: today through today
 * - Yesterday: today minus 1 day through today minus 1 day
 * - Last 7 days: today minus 6 days through today
 * - Last 14 days: today minus 13 days through today
 * - This week: Monday of current week through today
 * - This month: 1st of current month through today
 * - Last month: full previous calendar month
 * - Next 7 days: today through today + 6 days
 * - Upcoming: today onwards (to is empty string)
 */
export function getPresetDates(preset: DatePreset): { from: string; to: string } {
  if (preset === 'all' || preset === 'custom') {
    return { from: '', to: '' };
  }

  const today = getPerthTodayParts();
  const todayStr = today.dateStr;

  if (preset === 'today') {
    return { from: todayStr, to: todayStr };
  }

  if (preset === 'yesterday') {
    const yestStr = addDaysToDateStr(todayStr, -1);
    return { from: yestStr, to: yestStr };
  }

  if (preset === 'this_week') {
    // Monday of current week through today
    const dObj = new Date(today.year, today.month - 1, today.day, 12, 0, 0);
    const dayOfWeek = dObj.getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayStr = addDaysToDateStr(todayStr, diffToMon);
    return { from: mondayStr, to: todayStr };
  }

  if (preset === 'last_7_days') {
    // today minus 6 days through today (7 calendar days inclusive)
    const fromStr = addDaysToDateStr(todayStr, -6);
    return { from: fromStr, to: todayStr };
  }

  if (preset === 'last_14_days') {
    // today minus 13 days through today (14 calendar days inclusive)
    const fromStr = addDaysToDateStr(todayStr, -13);
    return { from: fromStr, to: todayStr };
  }

  if (preset === 'this_month') {
    // 1st of month through today
    const firstOfMonthStr = `${today.year}-${String(today.month).padStart(2, '0')}-01`;
    return { from: firstOfMonthStr, to: todayStr };
  }

  if (preset === 'last_month') {
    // full previous calendar month
    const prevMonthDate = new Date(today.year, today.month - 2, 1, 12, 0, 0);
    const prevY = prevMonthDate.getFullYear();
    const prevM = prevMonthDate.getMonth() + 1;
    const lastDay = new Date(today.year, today.month - 1, 0, 12, 0, 0).getDate();
    const lastMonthFrom = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const lastMonthTo = `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from: lastMonthFrom, to: lastMonthTo };
  }

  if (preset === 'next_7_days') {
    // today through today + 6 days
    const next7Str = addDaysToDateStr(todayStr, 6);
    return { from: todayStr, to: next7Str };
  }

  if (preset === 'upcoming') {
    // today onwards
    return { from: todayStr, to: '' };
  }

  return { from: '', to: '' };
}

/**
 * Calculates the previous period equal in length immediately preceding the current range.
 * Compares strictly as plain calendar dates (no timezone shift).
 */
export function getPreviousPeriodRange(dateFrom: string, dateTo: string): { from: string; to: string } | null {
  if (!dateFrom || !dateTo) return null;

  let start = dateFrom;
  let end = dateTo;
  if (start > end) {
    start = dateTo;
    end = dateFrom;
  }

  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;

  const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);

  const diffMs = dt2.getTime() - dt1.getTime();
  const dayCount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (dayCount <= 0) return null;

  const prevEndStr = addDaysToDateStr(start, -1);
  const prevStartStr = addDaysToDateStr(prevEndStr, -(dayCount - 1));

  return {
    from: prevStartStr,
    to: prevEndStr,
  };
}

/**
 * Compares plain calendar dates formatted as YYYY-MM-DD.
 * Handles open-ended ranges (empty string for from or to) and auto-sorts inverted ranges.
 */
export function isDateInRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false;
  let effectiveFrom = from;
  let effectiveTo = to;
  if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    effectiveFrom = to;
    effectiveTo = from;
  }
  if (effectiveFrom && dateStr < effectiveFrom) return false;
  if (effectiveTo && dateStr > effectiveTo) return false;
  return true;
}
