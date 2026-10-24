import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { WEEKDAYS } from '../../constants/theme';

interface DayOfWeekPatternChartProps {
  rows: InspectionRow[];
  onSelectWeekday?: (weekday: number) => void;
  isDark?: boolean;
}

export const DayOfWeekPatternChart: React.FC<DayOfWeekPatternChartProps> = ({
  rows,
  onSelectWeekday,
  isDark,
}) => {
  const chartData = useMemo(() => {
    // Map weekday id (1=Mon ... 6=Sat, 0=Sun)
    const weekdayMap: Record<
      number,
      {
        id: number;
        name: string;
        fullName: string;
        total: number;
        dates: Set<string>;
      }
    > = {};

    WEEKDAYS.forEach((wd) => {
      weekdayMap[wd.id] = {
        id: wd.id,
        name: wd.name,
        fullName: wd.fullName,
        total: 0,
        dates: new Set(),
      };
    });

    rows.forEach((r) => {
      if (r.dayOfWeek !== -1 && weekdayMap[r.dayOfWeek]) {
        weekdayMap[r.dayOfWeek].total++;
        if (r.dateStr) {
          weekdayMap[r.dayOfWeek].dates.add(r.dateStr);
        }
      }
    });

    // Mon through Sun order
    return WEEKDAYS.map((wd) => {
      const entry = weekdayMap[wd.id];
      const countDates = entry.dates.size;
      const avg = countDates > 0 ? +(entry.total / countDates).toFixed(1) : 0;
      return {
        id: wd.id,
        name: wd.name,
        fullName: wd.fullName,
        avg,
        total: entry.total,
        occurrences: countDates,
      };
    });
  }, [rows]);

  const csvHeaders = ['Weekday', 'Average Per Day', 'Total Inspections', 'Calendar Days Count'];
  const csvRows = chartData.map((d) => [d.fullName, d.avg, d.total, d.occurrences]);

  return (
    <ChartCard
      title="Day of Week Pattern"
      subtitle="Average inspections scheduled per weekday across selected time range"
      csvFilename="day_of_week_pattern"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {rows.length === 0 ? (
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
                if (payload && payload.id !== undefined) {
                  onSelectWeekday?.(payload.id);
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
              dataKey="name"
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
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50">
                    <p className="font-bold text-slate-900 dark:text-white">{d.fullName}</p>
                    <p className="text-sky-600 dark:text-sky-400 font-semibold">
                      Average: <span className="font-bold">{d.avg}</span> / day
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {d.total} total across {d.occurrences} {d.fullName}s
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="avg"
              name="Avg Inspections / Day"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
