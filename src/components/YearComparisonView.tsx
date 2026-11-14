import React, { useState, useMemo, useEffect } from 'react';
import {
  GitCompareArrows,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowLeftRight,
  Calendar,
  CalendarRange,
  Download,
  BarChart3,
  TrendingUp,
  Search,
  Building,
  User,
  ArrowUpDown,
  Layers,
  Home,
  ClipboardList,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { InspectionRow } from '../types';
import { getPerthTodayParts } from '../utils/dateUtils';
import { getTypeColor } from '../constants/theme';
import { downloadCsv } from '../utils/csvExport';
import {
  REPORT_TYPES,
  MONTH_LABELS,
  FULL_MONTH_LABELS,
  YoyScope,
  WeekAlignment,
  extractAvailableYears,
  resolveYoyRanges,
  buildTypeComparison,
  buildMonthlyWeeklyTrend,
  buildSingleWeekDailyTrend,
  buildDailyOverlayTrend,
  buildFullYearMonthlyTrend,
  buildFullYearWeeklyTrend,
  buildEntityComparison,
  getMonthWeekBuckets,
  calcPctChange,
  makeDateStr,
  daysInMonth,
} from '../utils/yoyUtils';

interface YearComparisonViewProps {
  rows: InspectionRow[]; // Already filtered by non-date filters
  isDark?: boolean;
}

export const YearComparisonView: React.FC<YearComparisonViewProps> = ({ rows, isDark }) => {
  const perthToday = useMemo(() => getPerthTodayParts(), []);
  const availableYears = useMemo(() => extractAvailableYears(rows), [rows]);

  // Default: current Perth year vs previous year, current Perth month
  const [compareYear, setCompareYear] = useState<number>(() => perthToday.year);
  const [baseYear, setBaseYear] = useState<number>(() => perthToday.year - 1);
  const [scope, setScope] = useState<YoyScope>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => perthToday.month);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [weekAlignment, setWeekAlignment] = useState<WeekAlignment>('sun_sat');
  const [toDateOnly, setToDateOnly] = useState<boolean>(false);
  const [dayFrom, setDayFrom] = useState<number>(1);
  const [dayTo, setDayTo] = useState<number>(() => daysInMonth(perthToday.year, perthToday.month));

  const [customFrom, setCustomFrom] = useState<string>(() =>
    makeDateStr(perthToday.year, perthToday.month, 1)
  );
  const [customTo, setCustomTo] = useState<string>(() =>
    makeDateStr(perthToday.year, perthToday.month, daysInMonth(perthToday.year, perthToday.month))
  );

  // Ensure years stay valid if dataset updates
  useEffect(() => {
    if (!availableYears.includes(compareYear) && availableYears.length > 0) {
      setCompareYear(availableYears[0]);
    }
    if (!availableYears.includes(baseYear) && availableYears.length > 1) {
      setBaseYear(availableYears[1]);
    }
  }, [availableYears, compareYear, baseYear]);

  // Trend & breakdown view state
  const [typeFocus, setTypeFocus] = useState<string>('ALL');
  const [trendChartStyle, setTrendChartStyle] = useState<'bar' | 'line'>('bar');
  const [monthTrendMode, setMonthTrendMode] = useState<'weekly' | 'daily'>('weekly');
  const [yearTrendMode, setYearTrendMode] = useState<'monthly' | 'weekly'>('monthly');

  // Entity (Agency / Inspector) table state
  const [entityTab, setEntityTab] = useState<'agency' | 'inspector'>('agency');
  const [entitySearch, setEntitySearch] = useState('');
  const [entitySort, setEntitySort] = useState<'absDiff' | 'compare' | 'base' | 'diff' | 'name'>('absDiff');
  const [entitySortDir, setEntitySortDir] = useState<'asc' | 'desc'>('desc');

  // Per-month job counts across all 12 months for Compare & Baseline years
  const { monthCountsMap, yearCounts } = useMemo(() => {
    const map: Record<number, { comp: number; base: number }> = {};
    for (let m = 1; m <= 12; m++) {
      map[m] = { comp: 0, base: 0 };
    }
    let compYearTot = 0;
    let baseYearTot = 0;

    rows.forEach((r) => {
      if (!r.dateStr || r.dateStr.length < 7) return;
      const y = parseInt(r.dateStr.slice(0, 4), 10);
      const m = parseInt(r.dateStr.slice(5, 7), 10);
      if (m < 1 || m > 12) return;
      if (y === compareYear) {
        map[m].comp++;
        compYearTot++;
      }
      if (y === baseYear) {
        map[m].base++;
        baseYearTot++;
      }
    });

    return {
      monthCountsMap: map,
      yearCounts: { comp: compYearTot, base: baseYearTot },
    };
  }, [rows, compareYear, baseYear]);

  // Available week buckets for selected month (used in Week selector & Weekly table)
  const monthWeekBuckets = useMemo(
    () => getMonthWeekBuckets(compareYear, baseYear, selectedMonth, weekAlignment),
    [compareYear, baseYear, selectedMonth, weekAlignment]
  );

  // Clamp selectedWeek if switching to a month with 4 weeks
  useEffect(() => {
    if (selectedWeek > monthWeekBuckets.length && monthWeekBuckets.length > 0) {
      setSelectedWeek(monthWeekBuckets.length);
    }
  }, [monthWeekBuckets.length, selectedWeek]);

  // Max days in selected month
  const maxMonthDay = useMemo(
    () => Math.max(daysInMonth(compareYear, selectedMonth), daysInMonth(baseYear, selectedMonth)),
    [compareYear, baseYear, selectedMonth]
  );

  // Select a month and keep within-month filter active (resetting dayTo to new month length if at end)
  const handleSelectMonth = (mNum: number) => {
    setSelectedMonth(mNum);
    const newMax = daysInMonth(compareYear, mNum);
    setDayFrom(1);
    setDayTo(newMax);
    if (scope === 'year' || scope === 'custom') {
      setScope('month');
      setToDateOnly(false);
    }
  };

  // Resolve active Compare and Baseline date ranges
  const { compareRange, baseRange } = useMemo(
    () =>
      resolveYoyRanges({
        scope,
        compareYear,
        baseYear,
        month: selectedMonth,
        weekNum: selectedWeek,
        weekAlignment,
        dayFrom,
        dayTo,
        toDateOnly,
        customFrom,
        customTo,
      }),
    [scope, compareYear, baseYear, selectedMonth, selectedWeek, weekAlignment, dayFrom, dayTo, toDateOnly, customFrom, customTo]
  );

  // Filter rows into Compare Year and Baseline Year buckets
  const { compareRows, baseRows } = useMemo(() => {
    const comp: InspectionRow[] = [];
    const base: InspectionRow[] = [];
    rows.forEach((r) => {
      if (!r.dateStr) return;
      if (compareRange.from && compareRange.to && r.dateStr >= compareRange.from && r.dateStr <= compareRange.to) {
        comp.push(r);
      }
      if (baseRange.from && baseRange.to && r.dateStr >= baseRange.from && r.dateStr <= baseRange.to) {
        base.push(r);
      }
    });
    return { compareRows: comp, baseRows: base };
  }, [rows, compareRange, baseRange]);

  // Summary KPIs
  const summaryStats = useMemo(() => {
    const compTotal = compareRows.length;
    const baseTotal = baseRows.length;
    const totalDiff = compTotal - baseTotal;
    const totalPct = calcPctChange(compTotal, baseTotal);

    const compUniqueSet = new Set<string>();
    const compDates = new Set<string>();
    compareRows.forEach((r) => {
      if (r.dateStr) compDates.add(r.dateStr);
      const addr = (r.address || '').toLowerCase().trim();
      if (addr) compUniqueSet.add(`${r.dateStr}:::${addr}`);
    });

    const baseUniqueSet = new Set<string>();
    const baseDates = new Set<string>();
    baseRows.forEach((r) => {
      if (r.dateStr) baseDates.add(r.dateStr);
      const addr = (r.address || '').toLowerCase().trim();
      if (addr) baseUniqueSet.add(`${r.dateStr}:::${addr}`);
    });

    const compUnique = compUniqueSet.size;
    const baseUnique = baseUniqueSet.size;
    const uniqueDiff = compUnique - baseUnique;
    const uniquePct = calcPctChange(compUnique, baseUnique);

    const compWorkingDays = compDates.size;
    const baseWorkingDays = baseDates.size;
    const compAvgDay = compWorkingDays > 0 ? +(compTotal / compWorkingDays).toFixed(1) : 0;
    const baseAvgDay = baseWorkingDays > 0 ? +(baseTotal / baseWorkingDays).toFixed(1) : 0;
    const avgDiff = +(compAvgDay - baseAvgDay).toFixed(1);
    const avgPct = calcPctChange(compAvgDay, baseAvgDay);

    return {
      compTotal,
      baseTotal,
      totalDiff,
      totalPct,
      compUnique,
      baseUnique,
      uniqueDiff,
      uniquePct,
      compWorkingDays,
      baseWorkingDays,
      compAvgDay,
      baseAvgDay,
      avgDiff,
      avgPct,
    };
  }, [compareRows, baseRows]);

  // Report Type Breakdown
  const typeComparison = useMemo(
    () => buildTypeComparison(compareRows, baseRows),
    [compareRows, baseRows]
  );

  // Biggest mover among report types
  const biggestMover = useMemo(() => {
    const nonZero = typeComparison.filter((t) => t.baseCount > 0 || t.compareCount > 0);
    if (nonZero.length === 0) return null;
    const sorted = [...nonZero].sort(
      (a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.compareCount - a.compareCount
    );
    return sorted[0];
  }, [typeComparison]);

  // Trend Data based on current scope & sub-mode
  const trendData = useMemo(() => {
    if (scope === 'month') {
      if (monthTrendMode === 'weekly') {
        return buildMonthlyWeeklyTrend(
          rows,
          compareYear,
          baseYear,
          selectedMonth,
          weekAlignment,
          typeFocus
        );
      }
      return buildDailyOverlayTrend(compareRows, baseRows, compareRange, baseRange, typeFocus);
    }
    if (scope === 'week') {
      return buildSingleWeekDailyTrend(
        compareRows,
        baseRows,
        compareRange,
        baseRange,
        weekAlignment,
        typeFocus
      );
    }
    if (scope === 'year') {
      if (yearTrendMode === 'monthly') {
        return buildFullYearMonthlyTrend(compareRows, baseRows, compareYear, baseYear, typeFocus);
      }
      return buildFullYearWeeklyTrend(compareRows, baseRows, compareYear, baseYear, typeFocus);
    }
    // Custom or month_dates
    return buildDailyOverlayTrend(compareRows, baseRows, compareRange, baseRange, typeFocus);
  }, [
    scope,
    monthTrendMode,
    yearTrendMode,
    rows,
    compareRows,
    baseRows,
    compareYear,
    baseYear,
    selectedMonth,
    weekAlignment,
    compareRange,
    baseRange,
    typeFocus,
  ]);

  // Monthly Weekly Table data (shown for all month-based scopes for easy weekly navigation)
  const monthlyWeeklyAllTypes = useMemo(() => {
    if (scope !== 'month' && scope !== 'week' && scope !== 'month_dates') return [];
    return buildMonthlyWeeklyTrend(
      rows,
      compareYear,
      baseYear,
      selectedMonth,
      weekAlignment,
      'ALL'
    );
  }, [scope, rows, compareYear, baseYear, selectedMonth, weekAlignment]);

  // Entity (Agency / Inspector) YoY breakdown
  const entityRows = useMemo(() => {
    const raw = buildEntityComparison(compareRows, baseRows, entityTab, typeFocus);
    const filtered = entitySearch.trim()
      ? raw.filter((e) => e.name.toLowerCase().includes(entitySearch.toLowerCase()))
      : raw;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (entitySort === 'absDiff') cmp = Math.abs(a.diff) - Math.abs(b.diff);
      else if (entitySort === 'compare') cmp = a.compareCount - b.compareCount;
      else if (entitySort === 'base') cmp = a.baseCount - b.baseCount;
      else if (entitySort === 'diff') cmp = a.diff - b.diff;
      else cmp = a.name.localeCompare(b.name);
      return entitySortDir === 'asc' ? cmp : -cmp;
    });
  }, [compareRows, baseRows, entityTab, typeFocus, entitySearch, entitySort, entitySortDir]);

  // Helper: Swap years
  const handleSwapYears = () => {
    const prevComp = compareYear;
    setCompareYear(baseYear);
    setBaseYear(prevComp);
  };

  // Helper UI badges
  const renderDiffBadge = (diff: number, pct: number | null, suffix = '') => {
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
          <span>+{diff.toLocaleString()}{suffix}</span>
          {pct !== null ? <span className="opacity-80">({pct > 0 ? `+${pct}` : pct}%)</span> : <span className="opacity-80">(New)</span>}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
          <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
          <span>{diff.toLocaleString()}{suffix}</span>
          {pct !== null && <span className="opacity-80">({pct}%)</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
        <Minus className="w-3 h-3" />
        <span>0 (0%)</span>
      </span>
    );
  };

  const renderCompactDelta = (diff: number) => {
    if (diff > 0) {
      return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{diff}</span>;
    }
    if (diff < 0) {
      return <span className="text-rose-600 dark:text-rose-400 font-semibold">{diff}</span>;
    }
    return <span className="text-slate-400">0</span>;
  };

  const currentMonthLabel = MONTH_LABELS[selectedMonth - 1];
  const fullMonthLabel = FULL_MONTH_LABELS[selectedMonth - 1];
  const isMonthScope = scope === 'month' || scope === 'week' || scope === 'month_dates';

  const scopeTitle = useMemo(() => {
    if (scope === 'month') {
      return `${fullMonthLabel}${toDateOnly ? ` (1–${perthToday.day})` : ''}: ${compareYear} vs ${baseYear}`;
    }
    if (scope === 'month_dates') {
      const startD = Math.min(dayFrom, dayTo);
      const endD = Math.max(dayFrom, dayTo);
      return `${fullMonthLabel} (${startD}–${endD}): ${compareYear} vs ${baseYear}`;
    }
    if (scope === 'week') {
      return `Week ${selectedWeek} of ${fullMonthLabel}: ${compareYear} vs ${baseYear}`;
    }
    if (scope === 'year') {
      return `Full Year${toDateOnly ? ` (YTD to ${perthToday.day} ${MONTH_LABELS[perthToday.month - 1]})` : ''}: ${compareYear} vs ${baseYear}`;
    }
    return `Custom Window: ${compareYear} vs ${baseYear}`;
  }, [scope, fullMonthLabel, toDateOnly, perthToday, compareYear, baseYear, selectedWeek, dayFrom, dayTo]);

  // CSV exports
  const handleExportTypeCsv = () => {
    const headers = [
      'Report Type',
      `${baseYear} Count`,
      `${baseYear} Share (%)`,
      `${compareYear} Count`,
      `${compareYear} Share (%)`,
      'Change (#)',
      'Change (%)',
      'Share Shift (pp)',
    ];
    const dataRows = typeComparison.map((t) => [
      t.type,
      t.baseCount,
      `${t.baseSharePct}%`,
      t.compareCount,
      `${t.compareSharePct}%`,
      t.diff,
      t.pctChange !== null ? `${t.pctChange}%` : 'New',
      `${t.shareDiffPp > 0 ? '+' : ''}${t.shareDiffPp}`,
    ]);
    dataRows.push([
      'TOTAL',
      summaryStats.baseTotal,
      '100%',
      summaryStats.compTotal,
      '100%',
      summaryStats.totalDiff,
      summaryStats.totalPct !== null ? `${summaryStats.totalPct}%` : 'New',
      '0',
    ]);
    downloadCsv(`yoy_report_types_${compareYear}_vs_${baseYear}`, headers, dataRows);
  };

  const handleExportTrendCsv = () => {
    const headers = [
      'Period',
      `${baseYear} Dates`,
      `${compareYear} Dates`,
      `${baseYear} Count`,
      `${compareYear} Count`,
      'Change (#)',
      'Change (%)',
    ];
    const dataRows = trendData.map((pt) => [
      pt.label,
      pt.baseDateLabel,
      pt.compareDateLabel,
      pt.baseCount,
      pt.compareCount,
      pt.diff,
      pt.pctChange !== null ? `${pt.pctChange}%` : 'New',
    ]);
    downloadCsv(`yoy_trend_${scope}_${compareYear}_vs_${baseYear}`, headers, dataRows);
  };

  const handleExportWeeklyBreakdownCsv = () => {
    const headers = [
      'Week',
      `${baseYear} Dates`,
      `${compareYear} Dates`,
      `${baseYear} Total`,
      `${compareYear} Total`,
      'Total Diff',
      'Total %',
      ...REPORT_TYPES.flatMap((t) => [`${t} ${baseYear}`, `${t} ${compareYear}`, `${t} Diff`]),
    ];
    const dataRows = monthlyWeeklyAllTypes.map((wk) => [
      wk.label,
      wk.baseDateLabel,
      wk.compareDateLabel,
      wk.baseCount,
      wk.compareCount,
      wk.diff,
      wk.pctChange !== null ? `${wk.pctChange}%` : 'New',
      ...REPORT_TYPES.flatMap((t) => {
        const b = wk.baseByType[t] || 0;
        const c = wk.compareByType[t] || 0;
        return [b, c, c - b];
      }),
    ]);
    downloadCsv(`yoy_weekly_breakdown_${currentMonthLabel}_${compareYear}_vs_${baseYear}`, headers, dataRows);
  };

  const handleExportEntityCsv = () => {
    const headers = [
      entityTab === 'agency' ? 'Agency' : 'Inspector',
      'Report Type Filter',
      `${baseYear}`,
      `${compareYear}`,
      'Change (#)',
      'Change (%)',
    ];
    const dataRows = entityRows.map((e) => [
      e.name,
      typeFocus,
      e.baseCount,
      e.compareCount,
      e.diff,
      e.pctChange !== null ? `${e.pctChange}%` : 'New',
    ]);
    downloadCsv(`yoy_${entityTab}_changes_${compareYear}_vs_${baseYear}`, headers, dataRows);
  };

  const toggleEntitySort = (col: typeof entitySort) => {
    if (entitySort === col) {
      setEntitySortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setEntitySort(col);
      setEntitySortDir(col === 'name' ? 'asc' : 'desc');
    }
  };

  // Custom chart tooltips
  const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
  const axisTick = isDark ? '#94a3b8' : '#64748b';
  const baseBarColor = isDark ? '#64748b' : '#94a3b8';
  const compareBarColor = '#0284c7';

  return (
    <div className="space-y-6">
      {/* 1. Year-over-Year Filter & Scope Control Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Row: Title + Year Pair */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Year-over-Year Comparison
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select any month (Jan–Dec) or Full Year, then narrow down by Week or specific Dates
              </p>
            </div>
          </div>

          {/* Year Pair Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl px-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
              <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 uppercase">Compare:</span>
              <select
                value={compareYear}
                onChange={(e) => setCompareYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-sky-900 dark:text-sky-100 focus:outline-hidden cursor-pointer"
                aria-label="Compare Year"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSwapYears}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Swap Compare & Baseline years"
              aria-label="Swap years"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Baseline:</span>
              <select
                value={baseYear}
                onChange={(e) => setBaseYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                aria-label="Baseline Year"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* All Months Strip: Full Year + Jan..Dec + Custom Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Select Month or Full Year ({compareYear} vs {baseYear})
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              Numbers under each month show {compareYear} vs {baseYear} jobs
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 gap-1.5">
            {/* Full Year */}
            <button
              type="button"
              onClick={() => {
                setScope('year');
                setToDateOnly(false);
              }}
              className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl border text-center transition-all ${
                scope === 'year'
                  ? 'bg-sky-600 border-sky-600 text-white shadow-xs shadow-sky-600/20'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xs font-bold leading-tight">All Year</span>
              <span className={`text-[10px] leading-tight mt-0.5 tabular-nums ${scope === 'year' ? 'text-sky-100' : 'text-slate-400'}`}>
                {yearCounts.comp}·{yearCounts.base}
              </span>
            </button>

            {/* All 12 Months (Jan - Dec) */}
            {MONTH_LABELS.map((mLabel, idx) => {
              const mNum = idx + 1;
              const isSelected = isMonthScope && selectedMonth === mNum;
              const isCurrentPerthMonth = mNum === perthToday.month;
              const counts = monthCountsMap[mNum] || { comp: 0, base: 0 };
              const hasData = counts.comp > 0 || counts.base > 0;

              return (
                <button
                  key={mLabel}
                  type="button"
                  onClick={() => handleSelectMonth(mNum)}
                  title={`${FULL_MONTH_LABELS[idx]}: ${compareYear} (${counts.comp} jobs) vs ${baseYear} (${counts.base} jobs)`}
                  className={`flex flex-col items-center justify-center px-1.5 py-1.5 rounded-xl border text-center transition-all relative ${
                    isSelected
                      ? 'bg-sky-600 border-sky-600 text-white shadow-xs shadow-sky-600/20'
                      : hasData
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">{mLabel}</span>
                  <span
                    className={`text-[10px] leading-tight mt-0.5 tabular-nums ${
                      isSelected ? 'text-sky-100' : hasData ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {counts.comp}·{counts.base}
                  </span>
                  {isCurrentPerthMonth && !isSelected && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
                      title="Current Perth month"
                    />
                  )}
                </button>
              );
            })}

            {/* Custom Cross-Month Range */}
            <button
              type="button"
              onClick={() => setScope('custom')}
              className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl border text-center transition-all ${
                scope === 'custom'
                  ? 'bg-sky-600 border-sky-600 text-white shadow-xs shadow-sky-600/20'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Compare any custom multi-month date window across years"
            >
              <span className="text-xs font-bold leading-tight">Custom</span>
              <span className={`text-[10px] leading-tight mt-0.5 ${scope === 'custom' ? 'text-sky-100' : 'text-slate-400'}`}>
                Dates
              </span>
            </button>
          </div>
        </div>

        {/* Within-Month Filter Panel (shown whenever ANY month Jan-Dec is active) */}
        {isMonthScope && (
          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                  Within {fullMonthLabel}:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setScope('month');
                    setToDateOnly(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'month' && !toDateOnly
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Full {currentMonthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('month');
                    setToDateOnly(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'month' && toDateOnly
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={`Days 1–${perthToday.day} of ${fullMonthLabel}`}
                >
                  Month-to-Date (1–{perthToday.day})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'week'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Filter by Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('month_dates');
                    if (dayTo > maxMonthDay) setDayTo(maxMonthDay);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'month_dates'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Filter by Dates
                </button>
              </div>

              {/* Week Alignment Switch (visible in Month & Week filters) */}
              {(scope === 'week' || (scope === 'month' && monthTrendMode === 'weekly')) && (
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setWeekAlignment('sun_sat')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      weekAlignment === 'sun_sat'
                        ? 'bg-sky-600 text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Match 7-day Sunday to Saturday calendar weeks"
                  >
                    Sun–Sat (7d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekAlignment('day_of_month')}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      weekAlignment === 'day_of_month'
                        ? 'bg-sky-600 text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Match exact dates of month: Days 1–7, 8–14, 15–21, 22–28, 29+"
                  >
                    Dates (1–7, 8–14…)
                  </button>
                </div>
              )}
            </div>

            {/* Sub-row: Week Selector when "Filter by Week" is active */}
            {scope === 'week' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                  Pick Week:
                </span>
                {monthWeekBuckets.map((b) => {
                  const isSelected = selectedWeek === b.weekNum;
                  return (
                    <button
                      key={b.weekNum}
                      type="button"
                      onClick={() => setSelectedWeek(b.weekNum)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="font-bold">{b.label}</span>
                      <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        ({b.compareRange.label.replace(` ${compareYear}`, '')})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-row: Within-Month Date Range Picker when "Filter by Dates" is active */}
            {scope === 'month_dates' && (
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Dates in {fullMonthLabel}:
                </span>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-slate-500">From day</span>
                  <select
                    value={dayFrom}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDayFrom(val);
                      if (val > dayTo) setDayTo(val);
                    }}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                    aria-label="Start day of month"
                  >
                    {Array.from({ length: maxMonthDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d} className="bg-white dark:bg-slate-900">
                        {d} {currentMonthLabel}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400">to</span>
                  <select
                    value={dayTo}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDayTo(val);
                      if (val < dayFrom) setDayFrom(val);
                    }}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                    aria-label="End day of month"
                  >
                    {Array.from({ length: maxMonthDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d} className="bg-white dark:bg-slate-900">
                        {d} {currentMonthLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick half-month / date shortcuts */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDayFrom(1);
                      setDayTo(Math.min(15, maxMonthDay));
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    1st – 15th
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDayFrom(16);
                      setDayTo(maxMonthDay);
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    16th – {maxMonthDay}th
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDayFrom(1);
                      setDayTo(Math.min(perthToday.day, maxMonthDay));
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    1st – {Math.min(perthToday.day, maxMonthDay)}th
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Year sub-options */}
        {scope === 'year' && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Comparing full year {compareYear} vs {baseYear} across all months
            </span>
            <button
              type="button"
              onClick={() => setToDateOnly(!toDateOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                toDateOnly
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>
                {toDateOnly
                  ? `Year-to-Date (1 Jan – ${perthToday.day} ${MONTH_LABELS[perthToday.month - 1]})`
                  : 'Full Calendar Year (1 Jan – 31 Dec)'}
              </span>
            </button>
          </div>
        )}

        {/* Custom Cross-Month Dates sub-options */}
        {scope === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Calendar window (applied to both {compareYear} &amp; {baseYear}):
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent focus:outline-hidden text-xs text-slate-800 dark:text-slate-100"
                aria-label="Custom start date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent focus:outline-hidden text-xs text-slate-800 dark:text-slate-100"
                aria-label="Custom end date"
              />
            </div>
          </div>
        )}

        {/* Active Resolved Comparison Window Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-bold text-slate-800 dark:text-slate-100">{scopeTitle}</span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
            <span className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              <strong>{compareYear}:</strong> {compareRange.label} ({summaryStats.compTotal.toLocaleString()} jobs)
            </span>
            <span className="text-slate-400">vs</span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <strong>{baseYear}:</strong> {baseRange.label} ({summaryStats.baseTotal.toLocaleString()} jobs)
            </span>
          </div>
          <div>{renderDiffBadge(summaryStats.totalDiff, summaryStats.totalPct, ' jobs')}</div>
        </div>
      </div>

      {/* 2. Summary KPI Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jobs (Reports)
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summaryStats.compTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              vs {summaryStats.baseTotal.toLocaleString()} ({baseYear})
            </span>
          </div>
          <div className="mt-2">{renderDiffBadge(summaryStats.totalDiff, summaryStats.totalPct)}</div>
        </div>

        {/* Unique Properties */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unique Properties
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summaryStats.compUnique.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              vs {summaryStats.baseUnique.toLocaleString()} ({baseYear})
            </span>
          </div>
          <div className="mt-2">{renderDiffBadge(summaryStats.uniqueDiff, summaryStats.uniquePct)}</div>
        </div>

        {/* Avg Per Working Day */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg / Working Day
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summaryStats.compAvgDay}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              vs {summaryStats.baseAvgDay} ({baseYear})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {renderDiffBadge(summaryStats.avgDiff, summaryStats.avgPct)}
            <span className="text-[11px] text-slate-400">
              {summaryStats.compWorkingDays} vs {summaryStats.baseWorkingDays} days
            </span>
          </div>
        </div>

        {/* Biggest Report Type Mover */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Biggest Type Change
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          {biggestMover ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getTypeColor(biggestMover.type).hex }}
                />
                <span className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {biggestMover.type}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {renderDiffBadge(biggestMover.diff, biggestMover.pctChange)}
                <span className="text-[11px] text-slate-400">
                  {biggestMover.baseCount} → {biggestMover.compareCount}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-slate-400">No jobs in selected windows</div>
          )}
        </div>
      </div>

      {/* 3. Report Type Breakdown (Table + Side-by-Side Chart) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table: Report Type Changes */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Changes by Report Type</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any report type row to focus the trend charts below
              </p>
            </div>
            <div className="flex items-center gap-2">
              {typeFocus !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTypeFocus('ALL')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100"
                >
                  <span>Trend: {typeFocus}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={handleExportTypeCsv}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Export report type comparison to CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2 pr-3">Report Type</th>
                  <th className="py-2 px-2 text-right">{baseYear}</th>
                  <th className="py-2 px-2 text-right">{compareYear}</th>
                  <th className="py-2 px-2 text-right">Change (#)</th>
                  <th className="py-2 px-2 text-right">Change (%)</th>
                  <th className="py-2 pl-2 text-right hidden sm:table-cell">Mix Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {typeComparison.map((row) => {
                  const color = getTypeColor(row.type);
                  const isFocused = typeFocus === row.type;
                  return (
                    <tr
                      key={row.type}
                      onClick={() => setTypeFocus((prev) => (prev === row.type ? 'ALL' : row.type))}
                      className={`cursor-pointer transition-colors ${
                        isFocused
                          ? 'bg-sky-50/90 dark:bg-sky-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{row.type}</span>
                          {isFocused && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white">
                              <Check className="w-2.5 h-2.5" />
                              Trend
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{row.baseCount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({row.baseSharePct}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-900 dark:text-white">
                        <span className="font-bold">{row.compareCount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({row.compareSharePct}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {renderCompactDelta(row.diff)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {row.diff === 0 ? (
                          <span className="text-slate-400">0%</span>
                        ) : row.pctChange === null ? (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold text-[10px]">
                            New
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                              row.pctChange > 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {row.pctChange > 0 ? `+${row.pctChange}%` : `${row.pctChange}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pl-2 text-right tabular-nums hidden sm:table-cell text-slate-500 dark:text-slate-400">
                        {row.shareDiffPp > 0 ? `+${row.shareDiffPp} pp` : `${row.shareDiffPp} pp`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-white">
                  <td className="py-2.5 pr-3">TOTAL</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {summaryStats.baseTotal.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {summaryStats.compTotal.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {renderCompactDelta(summaryStats.totalDiff)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {summaryStats.totalPct !== null ? (
                      <span
                        className={
                          summaryStats.totalPct > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : summaryStats.totalPct < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {summaryStats.totalPct > 0 ? `+${summaryStats.totalPct}%` : `${summaryStats.totalPct}%`}
                      </span>
                    ) : (
                      'New'
                    )}
                  </td>
                  <td className="py-2.5 pl-2 text-right hidden sm:table-cell text-slate-400">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Chart: Report Type Side-by-Side Comparison */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <span>Report Type Volume ({compareYear} vs {baseYear})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side comparison across all inspection types
            </p>
          </div>

          <div className="mt-4 h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeComparison}
                layout="vertical"
                margin={{ top: 5, right: 16, left: 10, bottom: 5 }}
                onClick={(e: any) => {
                  const typeName = e?.activePayload?.[0]?.payload?.type;
                  if (typeName) {
                    setTypeFocus((prev) => (prev === typeName ? 'ALL' : typeName));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: axisTick }} />
                <YAxis
                  dataKey="type"
                  type="category"
                  width={118}
                  tick={{ fontSize: 10, fill: axisTick, fontWeight: 600 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getTypeColor(item.type).hex }}
                          />
                          <span>{item.type}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">{compareYear}:</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">{item.compareCount}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">{baseYear}:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.baseCount}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                          <span className="text-slate-500">Change:</span>
                          <span
                            className={`font-bold ${
                              item.diff > 0
                                ? 'text-emerald-600'
                                : item.diff < 0
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.diff > 0 ? `+${item.diff}` : item.diff}{' '}
                            {item.pctChange !== null ? `(${item.pctChange > 0 ? `+${item.pctChange}` : item.pctChange}%)` : '(New)'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="baseCount"
                  name={`${baseYear}`}
                  fill={baseBarColor}
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="compareCount"
                  name={`${compareYear}`}
                  fill={compareBarColor}
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Weekly / Period Trend Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span>
                {scope === 'month' &&
                  (monthTrendMode === 'weekly'
                    ? `Weekly Trend in ${fullMonthLabel} (${compareYear} vs ${baseYear})`
                    : `Daily Overlay in ${fullMonthLabel} (${compareYear} vs ${baseYear})`)}
                {scope === 'month_dates' &&
                  `Daily Trend — ${fullMonthLabel} Days ${Math.min(dayFrom, dayTo)}–${Math.max(dayFrom, dayTo)} (${compareYear} vs ${baseYear})`}
                {scope === 'week' &&
                  `Day-by-Day Trend — Week ${selectedWeek} of ${fullMonthLabel} (${compareYear} vs ${baseYear})`}
                {scope === 'year' &&
                  (yearTrendMode === 'monthly'
                    ? `Monthly Trend (${compareYear} vs ${baseYear})`
                    : `Weekly Trend W1–W52 (${compareYear} vs ${baseYear})`)}
                {scope === 'custom' && `Daily Trend Across Custom Window (${compareYear} vs ${baseYear})`}
              </span>
              {typeFocus !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                  {typeFocus}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {scope === 'month' && monthTrendMode === 'weekly'
                ? weekAlignment === 'sun_sat'
                  ? 'Comparing aligned 7-day Sunday–Saturday weeks. Click any week bar or table row below to inspect its daily breakdown.'
                  : 'Comparing exact calendar day blocks (Days 1–7, 8–14, 15–21, 22–28, 29+).'
                : scope === 'week' || scope === 'month_dates'
                ? `${compareYear}: ${compareRange.label} vs ${baseYear}: ${baseRange.label}`
                : 'Hover bars for exact date windows and year-over-year percentage change.'}
            </p>
          </div>

          {/* Trend Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Alignment Toggle in Month view */}
            {scope === 'month' && monthTrendMode === 'weekly' && (
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setWeekAlignment('sun_sat')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    weekAlignment === 'sun_sat'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sun–Sat
                </button>
                <button
                  type="button"
                  onClick={() => setWeekAlignment('day_of_month')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    weekAlignment === 'day_of_month'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Days 1–7
                </button>
              </div>
            )}

            {/* Month view: Weekly vs Daily */}
            {scope === 'month' && (
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMonthTrendMode('weekly')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    monthTrendMode === 'weekly'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setMonthTrendMode('daily')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    monthTrendMode === 'daily'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Daily
                </button>
              </div>
            )}

            {/* Year view: Monthly vs Weekly */}
            {scope === 'year' && (
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setYearTrendMode('monthly')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    yearTrendMode === 'monthly'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setYearTrendMode('weekly')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    yearTrendMode === 'weekly'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Weekly (W1–W52)
                </button>
              </div>
            )}

            {/* Bar vs Line */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTrendChartStyle('bar')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  trendChartStyle === 'bar'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Bars
              </button>
              <button
                type="button"
                onClick={() => setTrendChartStyle('line')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  trendChartStyle === 'line'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Lines
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportTrendCsv}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Export trend data to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Type Focus Pills inside Trend Section */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Focus Type:
          </span>
          <button
            type="button"
            onClick={() => setTypeFocus('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium border transition-all ${
              typeFocus === 'ALL'
                ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Types
          </button>
          {REPORT_TYPES.map((t) => {
            const color = getTypeColor(t);
            const active = typeFocus === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFocus((prev) => (prev === t ? 'ALL' : t))}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-all ${
                  active
                    ? `${color.bg} ${color.text} ${color.border} font-bold ring-1 ring-sky-500/30`
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                <span>{t}</span>
              </button>
            );
          })}
        </div>

        {/* Trend Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {trendChartStyle === 'bar' ? (
              <BarChart
                data={trendData}
                margin={{ top: 10, right: 16, left: -12, bottom: 5 }}
                onClick={(e: any) => {
                  const payload = e?.activePayload?.[0]?.payload;
                  if (!payload) return;
                  if (scope === 'month' && monthTrendMode === 'weekly' && payload.weekNum) {
                    setScope('week');
                    setSelectedWeek(payload.weekNum);
                  } else if (scope === 'year' && yearTrendMode === 'monthly') {
                    const mNum = MONTH_LABELS.indexOf(payload.label) + 1;
                    if (mNum >= 1 && mNum <= 12) {
                      setScope('month');
                      setSelectedMonth(mNum);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTick }} />
                <YAxis tick={{ fontSize: 11, fill: axisTick }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {pt.label} {typeFocus !== 'ALL' ? `· ${typeFocus}` : ''}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sky-600 dark:text-sky-400 font-medium">
                            {compareYear} ({pt.compareDateLabel}):
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{pt.compareCount}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 font-medium">
                            {baseYear} ({pt.baseDateLabel}):
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{pt.baseCount}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                          <span className="text-slate-500">Change:</span>
                          <span
                            className={`font-bold ${
                              pt.diff > 0
                                ? 'text-emerald-600'
                                : pt.diff < 0
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {pt.diff > 0 ? `+${pt.diff}` : pt.diff}{' '}
                            {pt.pctChange !== null ? `(${pt.pctChange > 0 ? `+${pt.pctChange}` : pt.pctChange}%)` : '(New)'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="baseCount"
                  name={`${baseYear}`}
                  fill={baseBarColor}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="compareCount"
                  name={`${compareYear}`}
                  fill={typeFocus !== 'ALL' ? getTypeColor(typeFocus).hex : compareBarColor}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 16, left: -12, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTick }} />
                <YAxis tick={{ fontSize: 11, fill: axisTick }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {pt.label} {typeFocus !== 'ALL' ? `· ${typeFocus}` : ''}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sky-600 dark:text-sky-400 font-medium">
                            {compareYear} ({pt.compareDateLabel}):
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{pt.compareCount}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 font-medium">
                            {baseYear} ({pt.baseDateLabel}):
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{pt.baseCount}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                          <span className="text-slate-500">Change:</span>
                          <span
                            className={`font-bold ${
                              pt.diff > 0
                                ? 'text-emerald-600'
                                : pt.diff < 0
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {pt.diff > 0 ? `+${pt.diff}` : pt.diff}{' '}
                            {pt.pctChange !== null ? `(${pt.pctChange > 0 ? `+${pt.pctChange}` : pt.pctChange}%)` : '(New)'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="baseCount"
                  name={`${baseYear}`}
                  stroke={baseBarColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="compareCount"
                  name={`${compareYear}`}
                  stroke={typeFocus !== 'ALL' ? getTypeColor(typeFocus).hex : compareBarColor}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Weekly Breakdown Table with per-type changes (shown in Month, Week & Date-range scopes) */}
        {isMonthScope && monthlyWeeklyAllTypes.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {fullMonthLabel} Weekly Breakdown ({weekAlignment === 'sun_sat' ? 'Sun–Sat 7-Day Weeks' : 'Days 1–7 Blocks'})
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any week row to switch to that week&apos;s detailed view (shows {compareYear} vs {baseYear} &amp; net change per type)
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportWeeklyBreakdownCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Weekly CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2 pr-3">Week</th>
                    <th className="py-2 px-2">{baseYear} Dates</th>
                    <th className="py-2 px-2">{compareYear} Dates</th>
                    <th className="py-2 px-2 text-right">{baseYear}</th>
                    <th className="py-2 px-2 text-right">{compareYear}</th>
                    <th className="py-2 px-2 text-right">Diff</th>
                    {REPORT_TYPES.map((t) => (
                      <th key={t} className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getTypeColor(t).hex }}
                          />
                          <span>{t === 'PCR PHOTOS ONLY' ? 'PCR PHOTOS' : t}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {monthlyWeeklyAllTypes.map((wk) => {
                    const isActiveWeek = scope === 'week' && selectedWeek === wk.weekNum;
                    return (
                      <tr
                        key={wk.key}
                        onClick={() => {
                          if (wk.weekNum) {
                            setScope('week');
                            setSelectedWeek(wk.weekNum);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isActiveWeek
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 font-medium'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {wk.label}
                        </td>
                        <td className="py-2 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {wk.baseDateLabel}
                        </td>
                        <td className="py-2 px-2 text-sky-700 dark:text-sky-300 font-medium whitespace-nowrap">
                          {wk.compareDateLabel}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {wk.baseCount}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                          {wk.compareCount}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                          {renderCompactDelta(wk.diff)}
                          {wk.pctChange !== null && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({wk.pctChange > 0 ? `+${wk.pctChange}` : wk.pctChange}%)
                            </span>
                          )}
                        </td>
                        {REPORT_TYPES.map((t) => {
                          const b = wk.baseByType[t] || 0;
                          const c = wk.compareByType[t] || 0;
                          const d = c - b;
                          return (
                            <td
                              key={t}
                              className="py-2 px-2 text-right tabular-nums whitespace-nowrap"
                              title={`${t}: ${baseYear} = ${b}, ${compareYear} = ${c}`}
                            >
                              <span className="text-slate-700 dark:text-slate-200 font-medium">{c}</span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({d > 0 ? `+${d}` : d})
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Top Changes by Agency / Inspector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {entityTab === 'agency' ? (
                  <Building className="w-4 h-4 text-sky-600" />
                ) : (
                  <User className="w-4 h-4 text-sky-600" />
                )}
                <span>Year-over-Year Movers by {entityTab === 'agency' ? 'Agency' : 'Inspector'}</span>
                {typeFocus !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                    {typeFocus}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Biggest volume increases and decreases between {baseYear} and {compareYear}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Agency / Inspector Tab Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setEntityTab('agency')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  entityTab === 'agency'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                By Agency
              </button>
              <button
                type="button"
                onClick={() => setEntityTab('inspector')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  entityTab === 'inspector'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                By Inspector
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder={`Filter ${entityTab}...`}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              {entitySearch && (
                <button
                  type="button"
                  onClick={() => setEntitySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportEntityCsv}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Export movers table to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th
                  onClick={() => toggleEntitySort('name')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="inline-flex items-center gap-1">
                    {entityTab === 'agency' ? 'Agency' : 'Inspector'}
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
                <th
                  onClick={() => toggleEntitySort('base')}
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {baseYear}
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
                <th
                  onClick={() => toggleEntitySort('compare')}
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {compareYear}
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
                <th
                  onClick={() => toggleEntitySort('diff')}
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Change (#)
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
                <th
                  onClick={() => toggleEntitySort('absDiff')}
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Change (%)
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {entityRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    No matching {entityTab} records in these windows
                  </td>
                </tr>
              ) : (
                entityRows.slice(0, 50).map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {item.baseCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                      {item.compareCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderCompactDelta(item.diff)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {item.diff === 0 ? (
                        <span className="text-slate-400">0%</span>
                      ) : item.pctChange === null ? (
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold text-[10px]">
                          New
                        </span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                            item.pctChange > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {item.pctChange > 0 ? `+${item.pctChange}%` : `${item.pctChange}%`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
