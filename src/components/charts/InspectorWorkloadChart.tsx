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
import { getTypeColor } from '../../constants/theme';

interface InspectorWorkloadChartProps {
  rows: InspectionRow[];
  onSelectInspector?: (name: string) => void;
  isDark?: boolean;
}

export const InspectorWorkloadChart: React.FC<InspectorWorkloadChartProps> = ({
  rows,
  onSelectInspector,
  isDark,
}) => {
  const [stackedByType, setStackedByType] = useState(true);

  // Group by inspector
  const chartData = useMemo(() => {
    const inspectorMap: Record<
      string,
      {
        name: string;
        total: number;
        daysWorked: Set<string>;
        types: Record<string, number>;
      }
    > = {};

    rows.forEach((r) => {
      const name = r.inspector || 'Unassigned';
      if (!inspectorMap[name]) {
        inspectorMap[name] = {
          name,
          total: 0,
          daysWorked: new Set(),
          types: {},
        };
      }
      inspectorMap[name].total++;
      if (r.dateStr) {
        inspectorMap[name].daysWorked.add(r.dateStr);
      }
      inspectorMap[name].types[r.type] = (inspectorMap[name].types[r.type] || 0) + 1;
    });

    return Object.values(inspectorMap)
      .map((item) => {
        const uniqueDays = item.daysWorked.size;
        const avgPerDayWorked = uniqueDays > 0 ? +(item.total / uniqueDays).toFixed(1) : 0;
        return {
          name: item.name,
          total: item.total,
          daysWorked: uniqueDays,
          avgPerDayWorked,
          ...item.types,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    rows.forEach((r) => {
      if (r.type) types.add(r.type);
    });
    return Array.from(types);
  }, [rows]);

  const csvHeaders = ['Inspector', 'Total Inspections', 'Days Worked', 'Avg / Day Worked', ...allTypes];
  const csvRows = chartData.map((d) => [
    d.name,
    d.total,
    d.daysWorked,
    d.avgPerDayWorked,
    ...allTypes.map((t) => (d as any)[t] || 0),
  ]);

  const extraControls = (
    <button
      type="button"
      onClick={() => setStackedByType(!stackedByType)}
      className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-all ${
        stackedByType
          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {stackedByType ? 'Stack by Type' : 'Single Bar'}
    </button>
  );

  return (
    <ChartCard
      title="Inspector Workload"
      subtitle="Total volume & efficiency sorted high to low (click bar to filter by inspector)"
      extraControls={extraControls}
      csvFilename="inspector_workload"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No inspector data for selected filters
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(290, chartData.length * 36)}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const payload = e.activePayload[0].payload;
                if (payload && payload.name) {
                  onSelectInspector?.(payload.name);
                }
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke={isDark ? '#334155' : '#f1f5f9'}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#334155', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                    <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Total: <span className="font-semibold">{d.total}</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Days worked: <span className="font-semibold">{d.daysWorked}</span>
                    </p>
                    <p className="text-sky-600 dark:text-sky-400 font-medium">
                      Avg / day worked: <span className="font-bold">{d.avgPerDayWorked}</span>
                    </p>
                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                      {allTypes.map((t) => (
                        <div key={t} className="flex justify-between gap-4 text-[11px] text-slate-500">
                          <span>{t}:</span>
                          <span className="font-medium">{d[t] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

            {stackedByType ? (
              allTypes.map((t) => (
                <Bar
                  key={t}
                  dataKey={t}
                  name={t}
                  stackId="inspectorStack"
                  fill={getTypeColor(t).hex}
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                />
              ))
            ) : (
              <Bar
                dataKey="total"
                name="Total Inspections"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
