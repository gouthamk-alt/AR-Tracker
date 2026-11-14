import { InspectionRow } from '../types';
import { addDaysToDateStr, getPerthTodayParts } from './dateUtils';

export const REPORT_TYPES = [
  'PCR',
  'PCR PHOTOS ONLY',
  'INVENTORY',
  'FINAL BOND',
  'ROUTINE',
  'COMMERCIAL',
] as const;

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const FULL_MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type YoyScope = 'month' | 'week' | 'month_dates' | 'year' | 'custom';
export type WeekAlignment = 'sun_sat' | 'day_of_month';

export interface DateRangePair {
  from: string;
  to: string;
  label: string;
}

export interface WeekBucketDef {
  weekNum: number; // 1..5
  label: string;   // e.g. "Week 1"
  compareRange: DateRangePair;
  baseRange: DateRangePair;
}

export interface TypeComparisonRow {
  type: string;
  baseCount: number;
  compareCount: number;
  diff: number;
  pctChange: number | null;
  baseSharePct: number;
  compareSharePct: number;
  shareDiffPp: number;
}

export interface TrendBucketPoint {
  key: string;
  label: string;
  subLabel: string;
  baseDateLabel: string;
  compareDateLabel: string;
  baseCount: number;
  compareCount: number;
  diff: number;
  pctChange: number | null;
  weekNum?: number;
  baseByType: Record<string, number>;
  compareByType: Record<string, number>;
}

export interface EntityYoyRow {
  name: string;
  baseCount: number;
  compareCount: number;
  diff: number;
  pctChange: number | null;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0, 12, 0, 0).getDate();
}

export function makeDateStr(year: number, month: number, day: number): string {
  const maxD = daysInMonth(year, month);
  const clampedDay = Math.min(Math.max(1, day), maxD);
  return `${year}-${pad2(month)}-${pad2(clampedDay)}`;
}

export function formatShortRangeLabel(from: string, to: string): string {
  if (!from || !to) return '—';
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const m1Name = MONTH_LABELS[(m1 || 1) - 1];
  const m2Name = MONTH_LABELS[(m2 || 1) - 1];
  if (from === to) {
    return `${d1} ${m1Name} ${y1}`;
  }
  if (y1 === y2 && m1 === m2) {
    return `${d1}–${d2} ${m1Name} ${y1}`;
  }
  if (y1 === y2) {
    return `${d1} ${m1Name} – ${d2} ${m2Name} ${y1}`;
  }
  return `${d1} ${m1Name} ${y1} – ${d2} ${m2Name} ${y2}`;
}

export function formatCompactRange(from: string, to: string): string {
  if (!from || !to) return '—';
  const [, m1, d1] = from.split('-').map(Number);
  const [, m2, d2] = to.split('-').map(Number);
  const m1Name = MONTH_LABELS[(m1 || 1) - 1];
  const m2Name = MONTH_LABELS[(m2 || 1) - 1];
  if (from === to) return `${d1} ${m1Name}`;
  if (m1 === m2) return `${d1}–${d2} ${m1Name}`;
  return `${d1} ${m1Name}–${d2} ${m2Name}`;
}

export function normalizeReportType(row: InspectionRow): string {
  const t = (row.type || '').trim().toUpperCase();
  if (t === 'PCR') return 'PCR';
  if (t === 'PCR PHOTOS ONLY') return 'PCR PHOTOS ONLY';
  if (t === 'INVENTORY') return 'INVENTORY';
  if (t === 'FINAL BOND') return 'FINAL BOND';
  if (t === 'ROUTINE' || t.includes('ROUTINE') || row.source === 'Routine') return 'ROUTINE';
  if (t === 'COMMERCIAL' || t.includes('COMMERCIAL')) return 'COMMERCIAL';
  return t || 'OTHER';
}

export function extractAvailableYears(rows: InspectionRow[]): number[] {
  const perthToday = getPerthTodayParts();
  const years = new Set<number>([perthToday.year, perthToday.year - 1]);
  rows.forEach((r) => {
    if (r.dateStr && r.dateStr.length >= 4) {
      const y = parseInt(r.dateStr.slice(0, 4), 10);
      if (y >= 2000 && y <= 2100) {
        years.add(y);
      }
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Returns the Sunday (YYYY-MM-DD) of Week 1 of a given month using Sun-Sat alignment.
 * Week 1 is the first Sun-Sat week whose majority of days (>= 4 days, i.e., Wednesday) falls in that month.
 * Example:
 * - Nov 2026 starts on Sun 1 Nov -> Week 1 is Sun 1 Nov - Sat 7 Nov 2026.
 * - Nov 2025 starts on Sat 1 Nov -> first majority Sun-Sat week is Sun 2 Nov - Sat 8 Nov 2025.
 */
export function getFirstSunSatWeekStartOfMonth(year: number, month: number): string {
  const firstOfMonth = new Date(year, month - 1, 1, 12, 0, 0);
  const dow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const firstDateStr = `${year}-${pad2(month)}-01`;
  if (dow <= 3) {
    // Sun, Mon, Tue, Wed -> >= 4 days in this month
    return addDaysToDateStr(firstDateStr, -dow);
  }
  // Thu, Fri, Sat -> start on first Sunday in the month
  return addDaysToDateStr(firstDateStr, 7 - dow);
}

/**
 * Builds Weeks 1..5 definitions for comparing a specific month across two years.
 */
export function getMonthWeekBuckets(
  compareYear: number,
  baseYear: number,
  month: number,
  alignment: WeekAlignment
): WeekBucketDef[] {
  const buckets: WeekBucketDef[] = [];

  if (alignment === 'sun_sat') {
    const compW1Start = getFirstSunSatWeekStartOfMonth(compareYear, month);
    const baseW1Start = getFirstSunSatWeekStartOfMonth(baseYear, month);
    const compLastStr = `${compareYear}-${pad2(month)}-${pad2(daysInMonth(compareYear, month))}`;
    const baseLastStr = `${baseYear}-${pad2(month)}-${pad2(daysInMonth(baseYear, month))}`;

    for (let w = 1; w <= 5; w++) {
      const compStart = addDaysToDateStr(compW1Start, (w - 1) * 7);
      const compEnd = addDaysToDateStr(compStart, 6);
      const baseStart = addDaysToDateStr(baseW1Start, (w - 1) * 7);
      const baseEnd = addDaysToDateStr(baseStart, 6);

      // Include Week 5 only if its Sunday starts within the month in at least one of the two years
      if (w === 5 && compStart > compLastStr && baseStart > baseLastStr) {
        continue;
      }

      buckets.push({
        weekNum: w,
        label: `Week ${w}`,
        compareRange: {
          from: compStart,
          to: compEnd,
          label: formatShortRangeLabel(compStart, compEnd),
        },
        baseRange: {
          from: baseStart,
          to: baseEnd,
          label: formatShortRangeLabel(baseStart, baseEnd),
        },
      });
    }
  } else {
    // Month date blocks: 1-7, 8-14, 15-21, 22-28, 29-end
    const blocks: [number, number][] = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, 31],
    ];

    blocks.forEach(([startDay, endDay], idx) => {
      const compMax = daysInMonth(compareYear, month);
      const baseMax = daysInMonth(baseYear, month);
      if (startDay > compMax && startDay > baseMax) return;

      const compFrom = startDay <= compMax ? makeDateStr(compareYear, month, startDay) : '';
      const compTo = startDay <= compMax ? makeDateStr(compareYear, month, Math.min(endDay, compMax)) : '';
      const baseFrom = startDay <= baseMax ? makeDateStr(baseYear, month, startDay) : '';
      const baseTo = startDay <= baseMax ? makeDateStr(baseYear, month, Math.min(endDay, baseMax)) : '';

      buckets.push({
        weekNum: idx + 1,
        label: `Week ${idx + 1}`,
        compareRange: {
          from: compFrom,
          to: compTo,
          label: formatShortRangeLabel(compFrom, compTo),
        },
        baseRange: {
          from: baseFrom,
          to: baseTo,
          label: formatShortRangeLabel(baseFrom, baseTo),
        },
      });
    });
  }

  return buckets;
}

/**
 * Resolves the exact Compare and Baseline date ranges for the active YoY parameters.
 */
export function resolveYoyRanges(params: {
  scope: YoyScope;
  compareYear: number;
  baseYear: number;
  month: number;
  weekNum: number;
  weekAlignment: WeekAlignment;
  dayFrom?: number;
  dayTo?: number;
  toDateOnly: boolean;
  customFrom: string;
  customTo: string;
}): { compareRange: DateRangePair; baseRange: DateRangePair } {
  const perthToday = getPerthTodayParts();
  const {
    scope,
    compareYear,
    baseYear,
    month,
    weekNum,
    weekAlignment,
    dayFrom = 1,
    dayTo = 31,
    toDateOnly,
    customFrom,
    customTo,
  } = params;

  if (scope === 'month') {
    const compEndDay = toDateOnly ? Math.min(perthToday.day, daysInMonth(compareYear, month)) : daysInMonth(compareYear, month);
    const baseEndDay = toDateOnly ? Math.min(perthToday.day, daysInMonth(baseYear, month)) : daysInMonth(baseYear, month);

    const compFrom = makeDateStr(compareYear, month, 1);
    const compTo = makeDateStr(compareYear, month, compEndDay);
    const baseFrom = makeDateStr(baseYear, month, 1);
    const baseTo = makeDateStr(baseYear, month, baseEndDay);

    return {
      compareRange: { from: compFrom, to: compTo, label: formatShortRangeLabel(compFrom, compTo) },
      baseRange: { from: baseFrom, to: baseTo, label: formatShortRangeLabel(baseFrom, baseTo) },
    };
  }

  if (scope === 'month_dates') {
    const startD = Math.min(dayFrom, dayTo);
    const endD = Math.max(dayFrom, dayTo);
    const compMax = daysInMonth(compareYear, month);
    const baseMax = daysInMonth(baseYear, month);

    const compFrom = makeDateStr(compareYear, month, Math.min(startD, compMax));
    const compTo = makeDateStr(compareYear, month, Math.min(endD, compMax));
    const baseFrom = makeDateStr(baseYear, month, Math.min(startD, baseMax));
    const baseTo = makeDateStr(baseYear, month, Math.min(endD, baseMax));

    return {
      compareRange: { from: compFrom, to: compTo, label: formatShortRangeLabel(compFrom, compTo) },
      baseRange: { from: baseFrom, to: baseTo, label: formatShortRangeLabel(baseFrom, baseTo) },
    };
  }

  if (scope === 'week') {
    const buckets = getMonthWeekBuckets(compareYear, baseYear, month, weekAlignment);
    const found = buckets.find((b) => b.weekNum === weekNum) || buckets[0];
    return {
      compareRange: found.compareRange,
      baseRange: found.baseRange,
    };
  }

  if (scope === 'year') {
    if (toDateOnly) {
      const compFrom = `${compareYear}-01-01`;
      const compTo = makeDateStr(compareYear, perthToday.month, perthToday.day);
      const baseFrom = `${baseYear}-01-01`;
      const baseTo = makeDateStr(baseYear, perthToday.month, perthToday.day);
      return {
        compareRange: { from: compFrom, to: compTo, label: formatShortRangeLabel(compFrom, compTo) },
        baseRange: { from: baseFrom, to: baseTo, label: formatShortRangeLabel(baseFrom, baseTo) },
      };
    }

    const compFrom = `${compareYear}-01-01`;
    const compTo = `${compareYear}-12-31`;
    const baseFrom = `${baseYear}-01-01`;
    const baseTo = `${baseYear}-12-31`;
    return {
      compareRange: { from: compFrom, to: compTo, label: formatShortRangeLabel(compFrom, compTo) },
      baseRange: { from: baseFrom, to: baseTo, label: formatShortRangeLabel(baseFrom, baseTo) },
    };
  }

  // Custom: apply MM-DD window to both years
  let cFrom = customFrom || makeDateStr(compareYear, month, 1);
  let cTo = customTo || makeDateStr(compareYear, month, daysInMonth(compareYear, month));
  if (cFrom > cTo) {
    const tmp = cFrom;
    cFrom = cTo;
    cTo = tmp;
  }

  const [, fm, fd] = cFrom.split('-').map(Number);
  const [, tm, td] = cTo.split('-').map(Number);
  const compFrom = makeDateStr(compareYear, fm || month, fd || 1);
  const compTo = makeDateStr(compareYear, tm || month, td || 28);
  const baseFrom = makeDateStr(baseYear, fm || month, fd || 1);
  const baseTo = makeDateStr(baseYear, tm || month, td || 28);

  return {
    compareRange: { from: compFrom, to: compTo, label: formatShortRangeLabel(compFrom, compTo) },
    baseRange: { from: baseFrom, to: baseTo, label: formatShortRangeLabel(baseFrom, baseTo) },
  };
}

export function calcPctChange(compareVal: number, baseVal: number): number | null {
  if (baseVal === 0) {
    return compareVal === 0 ? 0 : null;
  }
  return +(((compareVal - baseVal) / baseVal) * 100).toFixed(1);
}

/**
 * Computes Type-by-Type comparison table rows across Compare vs Baseline rows.
 */
export function buildTypeComparison(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[]
): TypeComparisonRow[] {
  const counts: Record<string, { base: number; compare: number }> = {};
  REPORT_TYPES.forEach((t) => {
    counts[t] = { base: 0, compare: 0 };
  });

  baseRows.forEach((r) => {
    const t = normalizeReportType(r);
    if (!counts[t]) counts[t] = { base: 0, compare: 0 };
    counts[t].base++;
  });

  compareRows.forEach((r) => {
    const t = normalizeReportType(r);
    if (!counts[t]) counts[t] = { base: 0, compare: 0 };
    counts[t].compare++;
  });

  const baseTotal = baseRows.length;
  const compTotal = compareRows.length;

  const orderedKeys = [
    ...REPORT_TYPES,
    ...Object.keys(counts).filter((k) => !(REPORT_TYPES as readonly string[]).includes(k)).sort(),
  ];

  return orderedKeys.map((type) => {
    const b = counts[type]?.base || 0;
    const c = counts[type]?.compare || 0;
    const baseSharePct = baseTotal > 0 ? +((b / baseTotal) * 100).toFixed(1) : 0;
    const compareSharePct = compTotal > 0 ? +((c / compTotal) * 100).toFixed(1) : 0;
    return {
      type,
      baseCount: b,
      compareCount: c,
      diff: c - b,
      pctChange: calcPctChange(c, b),
      baseSharePct,
      compareSharePct,
      shareDiffPp: +(compareSharePct - baseSharePct).toFixed(1),
    };
  });
}

function countTypesMap(rows: InspectionRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const t = normalizeReportType(r);
    map[t] = (map[t] || 0) + 1;
  });
  return map;
}

function rowMatchesTypeFocus(row: InspectionRow, typeFocus: string): boolean {
  if (!typeFocus || typeFocus === 'ALL') return true;
  return normalizeReportType(row) === typeFocus;
}

/**
 * Builds Weekly Trend points for a Month across Week 1..5.
 */
export function buildMonthlyWeeklyTrend(
  allFilteredRows: InspectionRow[],
  compareYear: number,
  baseYear: number,
  month: number,
  alignment: WeekAlignment,
  typeFocus: string
): TrendBucketPoint[] {
  const buckets = getMonthWeekBuckets(compareYear, baseYear, month, alignment);

  return buckets.map((b) => {
    const compRows = allFilteredRows.filter(
      (r) =>
        r.dateStr &&
        b.compareRange.from &&
        r.dateStr >= b.compareRange.from &&
        r.dateStr <= b.compareRange.to &&
        rowMatchesTypeFocus(r, typeFocus)
    );
    const baseRows = allFilteredRows.filter(
      (r) =>
        r.dateStr &&
        b.baseRange.from &&
        r.dateStr >= b.baseRange.from &&
        r.dateStr <= b.baseRange.to &&
        rowMatchesTypeFocus(r, typeFocus)
    );

    const cCount = compRows.length;
    const bCount = baseRows.length;

    return {
      key: `W${b.weekNum}`,
      label: `Wk ${b.weekNum}`,
      subLabel: formatCompactRange(b.compareRange.from, b.compareRange.to),
      baseDateLabel: formatCompactRange(b.baseRange.from, b.baseRange.to),
      compareDateLabel: formatCompactRange(b.compareRange.from, b.compareRange.to),
      baseCount: bCount,
      compareCount: cCount,
      diff: cCount - bCount,
      pctChange: calcPctChange(cCount, bCount),
      weekNum: b.weekNum,
      baseByType: countTypesMap(baseRows),
      compareByType: countTypesMap(compRows),
    };
  });
}

/**
 * Builds Day-of-Week trend inside a single Week (Sun through Sat, or Days 1..7).
 */
export function buildSingleWeekDailyTrend(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[],
  compareRange: DateRangePair,
  baseRange: DateRangePair,
  alignment: WeekAlignment,
  typeFocus: string
): TrendBucketPoint[] {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const points: TrendBucketPoint[] = [];

  if (alignment === 'sun_sat' && compareRange.from && baseRange.from) {
    for (let offset = 0; offset < 7; offset++) {
      const cDate = addDaysToDateStr(compareRange.from, offset);
      const bDate = addDaysToDateStr(baseRange.from, offset);
      const [cy, cm, cd] = cDate.split('-').map(Number);
      const dObj = new Date(cy, cm - 1, cd, 12, 0, 0);
      const dayName = DAY_NAMES[dObj.getDay()];

      const cMatches = compareRows.filter((r) => r.dateStr === cDate && rowMatchesTypeFocus(r, typeFocus));
      const bMatches = baseRows.filter((r) => r.dateStr === bDate && rowMatchesTypeFocus(r, typeFocus));

      points.push({
        key: `D${offset}`,
        label: dayName,
        subLabel: formatCompactRange(cDate, cDate),
        baseDateLabel: formatShortRangeLabel(bDate, bDate),
        compareDateLabel: formatShortRangeLabel(cDate, cDate),
        baseCount: bMatches.length,
        compareCount: cMatches.length,
        diff: cMatches.length - bMatches.length,
        pctChange: calcPctChange(cMatches.length, bMatches.length),
        baseByType: countTypesMap(bMatches),
        compareByType: countTypesMap(cMatches),
      });
    }
    return points;
  }

  // Fallback for day_of_month alignment: match day offset 0..6
  for (let offset = 0; offset < 7; offset++) {
    const cDate = compareRange.from ? addDaysToDateStr(compareRange.from, offset) : '';
    const bDate = baseRange.from ? addDaysToDateStr(baseRange.from, offset) : '';
    if ((!cDate || cDate > compareRange.to) && (!bDate || bDate > baseRange.to)) break;

    const cValid = cDate && cDate <= compareRange.to;
    const bValid = bDate && bDate <= baseRange.to;
    const cMatches = cValid ? compareRows.filter((r) => r.dateStr === cDate && rowMatchesTypeFocus(r, typeFocus)) : [];
    const bMatches = bValid ? baseRows.filter((r) => r.dateStr === bDate && rowMatchesTypeFocus(r, typeFocus)) : [];

    const dayNum = cValid ? parseInt(cDate.slice(8, 10), 10) : parseInt(bDate.slice(8, 10), 10);

    points.push({
      key: `Day-${dayNum}`,
      label: `Day ${dayNum}`,
      subLabel: cValid ? formatCompactRange(cDate, cDate) : '—',
      baseDateLabel: bValid ? formatShortRangeLabel(bDate, bDate) : '—',
      compareDateLabel: cValid ? formatShortRangeLabel(cDate, cDate) : '—',
      baseCount: bMatches.length,
      compareCount: cMatches.length,
      diff: cMatches.length - bMatches.length,
      pctChange: calcPctChange(cMatches.length, bMatches.length),
      baseByType: countTypesMap(bMatches),
      compareByType: countTypesMap(cMatches),
    });
  }

  return points;
}

/**
 * Builds Day-by-Day (1..31) trend within a Month or Custom Date Range.
 */
export function buildDailyOverlayTrend(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[],
  compareRange: DateRangePair,
  baseRange: DateRangePair,
  typeFocus: string
): TrendBucketPoint[] {
  if (!compareRange.from || !compareRange.to || !baseRange.from || !baseRange.to) return [];

  const [cy1, cm1, cd1] = compareRange.from.split('-').map(Number);
  const [cy2, cm2, cd2] = compareRange.to.split('-').map(Number);
  const dt1 = new Date(cy1, cm1 - 1, cd1, 12, 0, 0);
  const dt2 = new Date(cy2, cm2 - 1, cd2, 12, 0, 0);
  const compDays = Math.round((dt2.getTime() - dt1.getTime()) / 86400000) + 1;

  const [by1, bm1, bd1] = baseRange.from.split('-').map(Number);
  const [by2, bm2, bd2] = baseRange.to.split('-').map(Number);
  const bdt1 = new Date(by1, bm1 - 1, bd1, 12, 0, 0);
  const bdt2 = new Date(by2, bm2 - 1, bd2, 12, 0, 0);
  const baseDays = Math.round((bdt2.getTime() - bdt1.getTime()) / 86400000) + 1;

  const totalDays = Math.min(Math.max(compDays, baseDays), 93);
  const points: TrendBucketPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const cDate = i < compDays ? addDaysToDateStr(compareRange.from, i) : '';
    const bDate = i < baseDays ? addDaysToDateStr(baseRange.from, i) : '';
    const cMatches = cDate ? compareRows.filter((r) => r.dateStr === cDate && rowMatchesTypeFocus(r, typeFocus)) : [];
    const bMatches = bDate ? baseRows.filter((r) => r.dateStr === bDate && rowMatchesTypeFocus(r, typeFocus)) : [];

    points.push({
      key: `D-${i}`,
      label: cDate ? formatCompactRange(cDate, cDate) : formatCompactRange(bDate, bDate),
      subLabel: `Day ${i + 1}`,
      baseDateLabel: bDate ? formatShortRangeLabel(bDate, bDate) : '—',
      compareDateLabel: cDate ? formatShortRangeLabel(cDate, cDate) : '—',
      baseCount: bMatches.length,
      compareCount: cMatches.length,
      diff: cMatches.length - bMatches.length,
      pctChange: calcPctChange(cMatches.length, bMatches.length),
      baseByType: countTypesMap(bMatches),
      compareByType: countTypesMap(cMatches),
    });
  }

  return points;
}

/**
 * Builds Jan-Dec Monthly trend for Full Year view.
 */
export function buildFullYearMonthlyTrend(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[],
  compareYear: number,
  baseYear: number,
  typeFocus: string
): TrendBucketPoint[] {
  return MONTH_LABELS.map((mName, idx) => {
    const mStr = pad2(idx + 1);
    const cPrefix = `${compareYear}-${mStr}`;
    const bPrefix = `${baseYear}-${mStr}`;

    const cMatches = compareRows.filter(
      (r) => r.dateStr.startsWith(cPrefix) && rowMatchesTypeFocus(r, typeFocus)
    );
    const bMatches = baseRows.filter(
      (r) => r.dateStr.startsWith(bPrefix) && rowMatchesTypeFocus(r, typeFocus)
    );

    return {
      key: `M-${idx + 1}`,
      label: mName,
      subLabel: FULL_MONTH_LABELS[idx],
      baseDateLabel: `${mName} ${baseYear}`,
      compareDateLabel: `${mName} ${compareYear}`,
      baseCount: bMatches.length,
      compareCount: cMatches.length,
      diff: cMatches.length - bMatches.length,
      pctChange: calcPctChange(cMatches.length, bMatches.length),
      baseByType: countTypesMap(bMatches),
      compareByType: countTypesMap(cMatches),
    };
  });
}

/**
 * Builds Week 1..52/53 (Sun-Sat) trend across a full year.
 */
export function buildFullYearWeeklyTrend(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[],
  compareYear: number,
  baseYear: number,
  typeFocus: string
): TrendBucketPoint[] {
  const compW1Start = getFirstSunSatWeekStartOfMonth(compareYear, 1);
  const baseW1Start = getFirstSunSatWeekStartOfMonth(baseYear, 1);

  const compMap: Record<number, InspectionRow[]> = {};
  const baseMap: Record<number, InspectionRow[]> = {};

  const compW1Date = new Date(
    parseInt(compW1Start.slice(0, 4), 10),
    parseInt(compW1Start.slice(5, 7), 10) - 1,
    parseInt(compW1Start.slice(8, 10), 10),
    12,
    0,
    0
  );
  const baseW1Date = new Date(
    parseInt(baseW1Start.slice(0, 4), 10),
    parseInt(baseW1Start.slice(5, 7), 10) - 1,
    parseInt(baseW1Start.slice(8, 10), 10),
    12,
    0,
    0
  );

  compareRows.forEach((r) => {
    if (!r.date || !rowMatchesTypeFocus(r, typeFocus)) return;
    const diffDays = Math.floor((r.date.getTime() - compW1Date.getTime()) / 86400000);
    const wk = Math.floor(diffDays / 7) + 1;
    const clampedWk = Math.min(Math.max(1, wk), 53);
    if (!compMap[clampedWk]) compMap[clampedWk] = [];
    compMap[clampedWk].push(r);
  });

  baseRows.forEach((r) => {
    if (!r.date || !rowMatchesTypeFocus(r, typeFocus)) return;
    const diffDays = Math.floor((r.date.getTime() - baseW1Date.getTime()) / 86400000);
    const wk = Math.floor(diffDays / 7) + 1;
    const clampedWk = Math.min(Math.max(1, wk), 53);
    if (!baseMap[clampedWk]) baseMap[clampedWk] = [];
    baseMap[clampedWk].push(r);
  });

  const points: TrendBucketPoint[] = [];
  const maxWeek = (compMap[53]?.length || baseMap[53]?.length) ? 53 : 52;
  for (let w = 1; w <= maxWeek; w++) {
    const cStart = addDaysToDateStr(compW1Start, (w - 1) * 7);
    const cEnd = addDaysToDateStr(cStart, 6);
    const bStart = addDaysToDateStr(baseW1Start, (w - 1) * 7);
    const bEnd = addDaysToDateStr(bStart, 6);

    const cMatches = compMap[w] || [];
    const bMatches = baseMap[w] || [];

    points.push({
      key: `YW-${w}`,
      label: `W${w}`,
      subLabel: formatCompactRange(cStart, cEnd),
      baseDateLabel: formatShortRangeLabel(bStart, bEnd),
      compareDateLabel: formatShortRangeLabel(cStart, cEnd),
      baseCount: bMatches.length,
      compareCount: cMatches.length,
      diff: cMatches.length - bMatches.length,
      pctChange: calcPctChange(cMatches.length, bMatches.length),
      weekNum: w,
      baseByType: countTypesMap(bMatches),
      compareByType: countTypesMap(cMatches),
    });
  }

  return points;
}

/**
 * Builds Agency or Inspector comparison rows across the two selected periods.
 */
export function buildEntityComparison(
  compareRows: InspectionRow[],
  baseRows: InspectionRow[],
  field: 'agency' | 'inspector',
  typeFocus: string
): EntityYoyRow[] {
  const map: Record<string, { base: number; compare: number }> = {};

  baseRows.forEach((r) => {
    if (!rowMatchesTypeFocus(r, typeFocus)) return;
    const key = (r[field] || (field === 'agency' ? 'Unknown Agency' : 'Unknown Inspector')).trim();
    if (!map[key]) map[key] = { base: 0, compare: 0 };
    map[key].base++;
  });

  compareRows.forEach((r) => {
    if (!rowMatchesTypeFocus(r, typeFocus)) return;
    const key = (r[field] || (field === 'agency' ? 'Unknown Agency' : 'Unknown Inspector')).trim();
    if (!map[key]) map[key] = { base: 0, compare: 0 };
    map[key].compare++;
  });

  return Object.entries(map)
    .map(([name, counts]) => ({
      name,
      baseCount: counts.base,
      compareCount: counts.compare,
      diff: counts.compare - counts.base,
      pctChange: calcPctChange(counts.compare, counts.base),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.compareCount - a.compareCount);
}
