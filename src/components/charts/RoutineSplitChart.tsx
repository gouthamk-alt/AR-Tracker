import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { formatShortDate } from '../../utils/dateUtils';

interface RoutineSplitChartProps {
  rows: InspectionRow[];
  onSelectDate?: (dateStr: string) => void;
  isDark?: boolean;
}

export const RoutineSplitChart: React.FC<RoutineSplitChartProps> = ({
  rows,
  onSelectDate,
  isDark,
}) => {
  const [viewType, setViewType] = useState<'stacked' | 'grouped'>('stacked');

  const chartData = useMemo(() => {
    const dateMap: Record<
      string,
      {
        dateStr: string;
        label: string;
        routine: number;
        nonRoutine: number;
        total: number;
      }
    > = {};

    rows.forEach((r) => {
      if (!r.dateStr) return;
      if (!dateMap[r.dateStr]) {
        dateMap[r.dateStr] = {
          dateStr: r.dateStr,
          label: r.date ? formatShortDate(r.date) : r.dateStr.slice(5),
          routine: 0,
          nonRoutine: 0,
          total: 0,
        };
      }

      const isRoutine = r.type === 'ROUTINE' || (r.type || '').toUpperCase().includes('ROUTINE') || r.source === 'Routine';
      if (isRoutine) {
        dateMap[r.dateStr].routine++;
      } else {
        dateMap[r.dateStr].nonRoutine++;
      }
      dateMap[r.dateStr].total++;
    });

    return Object.values(dateMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [rows]);

  const csvHeaders = ['Date', 'Routine Inspections', 'Non-Routine (Date list)', 'Total'];
  const csvRows = chartData.map((d) => [d.dateStr, d.routine, d.nonRoutine, d.total]);

  const extraControls = (
    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
      <button
        type="button"
        onClick={() => setViewType('stacked')}
        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          viewType === 'stacked'
            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
        }`}
      >
        Stacked
      </button>
      <button
        type="button"
        onClick={() => setViewType('grouped')}
        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
          viewType === 'grouped'
            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
        }`}
      >
        Side-by-side
      </button>
    </div>
  );

  return (
    <ChartCard
      title="Routine vs Non-Routine Inspections"
      subtitle="Periodic maintenance routines vs ad-hoc PCR, Bond & Inventory inspections"
      extraControls={extraControls}
      csvFilename="routine_vs_non_routine"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No data available for current filters
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const payload = e.activePayload[0].payload;
                if (payload && payload.dateStr) {
                  onSelectDate?.(payload.dateStr);
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
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            <Bar
              dataKey="routine"
              name="Routine"
              stackId={viewType === 'stacked' ? 'splitStack' : undefined}
              fill="#9333ea"
              radius={viewType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              cursor="pointer"
            />
            <Bar
              dataKey="nonRoutine"
              name="Non-Routine (Date list)"
              stackId={viewType === 'stacked' ? 'splitStack' : undefined}
              fill="#0284c7"
              radius={viewType === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
