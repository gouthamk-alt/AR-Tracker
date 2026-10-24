import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { getTypeColor } from '../../constants/theme';

interface TypeMixDonutChartProps {
  rows: InspectionRow[];
  onSelectType?: (type: string) => void;
  isDark?: boolean;
}

export const TypeMixDonutChart: React.FC<TypeMixDonutChartProps> = ({
  rows,
  onSelectType,
  isDark,
}) => {
  const { chartData, total } = useMemo(() => {
    const typeMap: Record<string, number> = {};
    rows.forEach((r) => {
      let t = (r.type || '').trim().toUpperCase();
      if (t.includes('ROUTINE') || r.source === 'Routine') {
        t = 'ROUTINE';
      } else if (!t) {
        t = 'PCR';
      }
      typeMap[t] = (typeMap[t] || 0) + 1;
    });

    const tot = rows.length;
    const list = Object.entries(typeMap).map(([name, value]) => {
      const pct = tot > 0 ? +((value / tot) * 100).toFixed(1) : 0;
      return {
        name,
        value,
        pct,
        color: getTypeColor(name).hex,
      };
    });

    list.sort((a, b) => b.value - a.value);

    return { chartData: list, total: tot };
  }, [rows]);

  const csvHeaders = ['Inspection Type', 'Count', 'Percentage (%)'];
  const csvRows = chartData.map((d) => [d.name, d.value, `${d.pct}%`]);

  return (
    <ChartCard
      title="Inspection Type Distribution"
      subtitle="Proportion of PCR, Routine, Inventory, and Final Bond jobs (click slice to filter)"
      csvFilename="type_mix"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No data available for current filters
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Count: <span className="font-semibold">{d.value}</span>
                      </p>
                      <p className="text-sky-600 dark:text-sky-400 font-medium">
                        Share: <span className="font-bold">{d.pct}%</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                cursor="pointer"
                onClick={(entry) => {
                  if (entry && entry.name) {
                    onSelectType?.(entry.name);
                  }
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value: string) => {
                  const item = chartData.find((d) => d.name === value);
                  return (
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {value} ({item?.pct}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Inner Center Label */}
          <div className="absolute top-[42%] -translate-y-1/2 pointer-events-none text-center">
            <span className="text-xs text-slate-400 block font-medium">Total</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {total}
            </span>
          </div>
        </div>
      )}
    </ChartCard>
  );
};
