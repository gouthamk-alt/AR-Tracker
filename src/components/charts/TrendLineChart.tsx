import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { formatShortDate, getPreviousPeriodRange } from '../../utils/dateUtils';

interface TrendLineChartProps {
  rows: InspectionRow[];
  allRows: InspectionRow[];
  dateFrom: string;
  dateTo: string;
  isDark?: boolean;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  rows,
  allRows,
  dateFrom,
  dateTo,
  isDark,
}) => {
  const [mode, setMode] = useState<'cumulative' | 'rolling'>('cumulative');

  // Compute daily totals for current period
  const { chartData, pctChangeVsPrev } = useMemo(() => {
    const dateCounts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.dateStr) {
        dateCounts[r.dateStr] = (dateCounts[r.dateStr] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(dateCounts).sort();
    let currentCumulative = 0;

    // Previous period data for comparison
    const prevPeriod = getPreviousPeriodRange(dateFrom, dateTo);
    const prevDateCounts: Record<string, number> = {};
    let prevTotal = 0;

    if (prevPeriod) {
      allRows.forEach((r) => {
        if (r.dateStr && r.dateStr >= prevPeriod.from && r.dateStr <= prevPeriod.to) {
          prevDateCounts[r.dateStr] = (prevDateCounts[r.dateStr] || 0) + 1;
          prevTotal++;
        }
      });
    }

    const prevSortedDates = Object.keys(prevDateCounts).sort();
    let prevCumulative = 0;
    const prevCumulativeArr: number[] = [];
    prevSortedDates.forEach((d) => {
      prevCumulative += prevDateCounts[d];
      prevCumulativeArr.push(prevCumulative);
    });

    const data = sortedDates.map((dateStr, idx) => {
      const dayCount = dateCounts[dateStr];
      currentCumulative += dayCount;

      // 7-day rolling total
      const windowStart = Math.max(0, idx - 6);
      const rollingTotal = sortedDates
        .slice(windowStart, idx + 1)
        .reduce((sum, d) => sum + dateCounts[d], 0);

      // Prev period cumulative equivalent day
      const prevCumVal = idx < prevCumulativeArr.length ? prevCumulativeArr[idx] : null;

      return {
        dateStr,
        label: dateStr.slice(5), // MM-DD
        dayCount,
        cumulative: currentCumulative,
        rollingTotal,
        prevCumulative: prevCumVal,
      };
    });

    const totalCurrent = rows.length;
    let pct: number | null = null;
    if (prevPeriod && prevTotal > 0) {
      pct = Math.round(((totalCurrent - prevTotal) / prevTotal) * 100);
    }

    return { chartData: data, pctChangeVsPrev: pct };
  }, [rows, allRows, dateFrom, dateTo]);

  const csvHeaders = ['Date', mode === 'cumulative' ? 'Cumulative Inspections' : '7-Day Rolling Total', 'Daily Count'];
  const csvRows = chartData.map((d) => [
    d.dateStr,
    mode === 'cumulative' ? d.cumulative : d.rollingTotal,
    d.dayCount,
  ]);

  const extraControls = (
    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
      <button
        type="button"
        onClick={() => setMode('cumulative')}
        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          mode === 'cumulative'
            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
        }`}
      >
        Cumulative
      </button>
      <button
        type="button"
        onClick={() => setMode('rolling')}
        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          mode === 'rolling'
            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
        }`}
      >
        7-Day Rolling
      </button>
    </div>
  );

  return (
    <ChartCard
      title="Inspection Trend & Velocity"
      subtitle={
        pctChangeVsPrev !== null
          ? `${pctChangeVsPrev >= 0 ? '+' : ''}${pctChangeVsPrev}% vs equivalent previous period`
          : 'Trajectory of completed inspections over selected duration'
      }
      extraControls={extraControls}
      csvFilename="inspection_trend"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No trend data for selected filters
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? '#334155' : '#f1f5f9'}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            <Area
              type="monotone"
              dataKey={mode === 'cumulative' ? 'cumulative' : 'rollingTotal'}
              name={mode === 'cumulative' ? 'Current Period' : '7-Day Rolling Volume'}
              stroke="#0284c7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#trendGradient)"
            />

            {mode === 'cumulative' && (
              <Line
                type="monotone"
                dataKey="prevCumulative"
                name="Previous Period (equiv day)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
