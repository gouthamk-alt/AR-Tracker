import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { TYPE_COLORS, getTypeColor } from '../../constants/theme';
import { formatShortDate } from '../../utils/dateUtils';

interface InspectionsPerDayChartProps {
  rows: InspectionRow[];
  onSelectDate?: (dateStr: string) => void;
  isDark?: boolean;
}

export type InspectionsStackMode = 'none' | 'type' | 'routine';

export const InspectionsPerDayChart: React.FC<InspectionsPerDayChartProps> = ({
  rows,
  onSelectDate,
  isDark,
}) => {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stackMode, setStackMode] = useState<InspectionsStackMode>('none');

  // Aggregation
  const chartData = useMemo(() => {
    // Map dates
    const dateMap: Record<
      string,
      {
        key: string;
        label: string;
        total: number;
        routineCount: number;
        nonRoutineCount: number;
        types: Record<string, number>;
        dateObj: Date | null;
      }
    > = {};

    rows.forEach((r) => {
      if (!r.dateStr) return;

      let groupKey = r.dateStr;
      let label = r.date ? formatShortDate(r.date) : r.dateStr;

      if (granularity === 'weekly' && r.date) {
        // Find Monday of the week
        const d = new Date(r.date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        groupKey = `W-${y}-${m}-${dt}`;
        label = `Wk ${dt}/${m}`;
      } else if (granularity === 'monthly' && r.date) {
        const y = r.date.getFullYear();
        const m = String(r.date.getMonth() + 1).padStart(2, '0');
        groupKey = `M-${y}-${m}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = `${monthNames[r.date.getMonth()]} ${y}`;
      }

      if (!dateMap[groupKey]) {
        dateMap[groupKey] = {
          key: groupKey,
          label,
          total: 0,
          routineCount: 0,
          nonRoutineCount: 0,
          types: {},
          dateObj: r.date,
        };
      }

      const isRoutine =
        (r.type || '').toUpperCase() === 'ROUTINE' ||
        (r.type || '').toUpperCase().includes('ROUTINE') ||
        r.source === 'Routine';

      dateMap[groupKey].total++;
      if (isRoutine) {
        dateMap[groupKey].routineCount++;
      } else {
        dateMap[groupKey].nonRoutineCount++;
      }

      dateMap[groupKey].types[r.type] = (dateMap[groupKey].types[r.type] || 0) + 1;
    });

    // Sort chronologically by key
    const sorted = Object.values(dateMap).sort((a, b) => a.key.localeCompare(b.key));

    // Calculate 7-period moving average
    return sorted.map((item, idx, arr) => {
      const windowStart = Math.max(0, idx - 6);
      const windowSlice = arr.slice(windowStart, idx + 1);
      const sum = windowSlice.reduce((acc, curr) => acc + curr.total, 0);
      const movingAvg = +(sum / windowSlice.length).toFixed(1);

      return {
        ...item,
        movingAvg,
        ...item.types,
      };
    });
  }, [rows, granularity]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    rows.forEach((r) => {
      if (r.type) types.add(r.type);
    });
    return Array.from(types);
  }, [rows]);

  // CSV Preparation
  const csvHeaders = [
    'Period',
    'Total Inspections',
    '7-Period Moving Avg',
    'Routine',
    'Non-Routine',
    ...allTypes,
  ];
  const csvRows = chartData.map((d) => [
    d.label,
    d.total,
    d.movingAvg,
    d.routineCount,
    d.nonRoutineCount,
    ...allTypes.map((t) => (d as any)[t] || 0),
  ]);

  const extraControls = (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Granularity */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
        {(['daily', 'weekly', 'monthly'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGranularity(g)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md capitalize transition-all ${
              granularity === g
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Stacking Options (Single / By Type / Routine vs Non-routine) */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
        {(['none', 'type', 'routine'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setStackMode(mode)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              stackMode === mode
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {mode === 'none' ? 'Single' : mode === 'type' ? 'By Type' : 'Routine / Non-routine'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChartCard
      title="Inspections Over Time"
      subtitle="Inspection volume with 7-period moving average trend line (click bar to filter date)"
      extraControls={extraControls}
      csvFilename={`inspections_${granularity}`}
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No inspection data for current filters
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const payload = e.activePayload[0].payload;
                if (payload && payload.key && granularity === 'daily') {
                  onSelectDate?.(payload.key);
                }
              }
            }}
          >
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
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />

            {stackMode === 'type' ? (
              allTypes.map((t) => (
                <Bar
                  key={t}
                  dataKey={t}
                  name={t}
                  stackId="stack"
                  fill={getTypeColor(t).hex}
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                />
              ))
            ) : stackMode === 'routine' ? (
              <>
                <Bar
                  dataKey="routineCount"
                  name="Routine"
                  stackId="stack"
                  fill="#9333ea"
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                />
                <Bar
                  dataKey="nonRoutineCount"
                  name="Non-Routine"
                  stackId="stack"
                  fill="#0284c7"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                />
              </>
            ) : (
              <Bar
                dataKey="total"
                name="Total Inspections"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              />
            )}

            <Line
              type="monotone"
              dataKey="movingAvg"
              name="7-period Moving Avg"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
