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

interface SizeDistributionChartProps {
  rows: InspectionRow[];
  onSelectSize?: (size: string) => void;
  isDark?: boolean;
}

export const SizeDistributionChart: React.FC<SizeDistributionChartProps> = ({
  rows,
  onSelectSize,
  isDark,
}) => {
  const { chartData, knownCount, totalJobs } = useMemo(() => {
    const sizeMap: Record<string, number> = {};
    let known = 0;

    rows.forEach((r) => {
      const s = (r.size || '').toUpperCase().replace(/\s+/g, '');
      if (r.size && s !== '0X0') {
        known++;
        sizeMap[r.size] = (sizeMap[r.size] || 0) + 1;
      }
    });

    const entries = Object.entries(sizeMap).map(([size, count]) => ({
      size,
      count,
    }));

    // Sort sizes naturally (e.g. 1X1, 2X1, 2X2, 3X1, 3X2, 4X2...)
    entries.sort((a, b) => {
      const parseSize = (s: string) => {
        const parts = s.toUpperCase().split('X');
        return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
      };
      const [b1, bth1] = parseSize(a.size);
      const [b2, bth2] = parseSize(b.size);
      if (b1 !== b2) return b1 - b2;
      return bth1 - bth2;
    });

    return {
      chartData: entries,
      knownCount: known,
      totalJobs: rows.length,
    };
  }, [rows]);

  const csvHeaders = ['Property Size (Bed x Bath)', 'Inspection Count'];
  const csvRows = chartData.map((d) => [d.size, d.count]);

  return (
    <ChartCard
      title="Jobs with a known size"
      subtitle={`${knownCount} of ${totalJobs} jobs have a size`}
      csvFilename="property_size_distribution"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No size specifications found in current filter selection
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const payload = e.activePayload[0].payload;
                if (payload && payload.size) {
                  onSelectSize?.(payload.size);
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
              dataKey="size"
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
              formatter={(val: any) => [`${val} jobs`, 'Count']}
            />
            <Bar
              dataKey="count"
              name="Jobs"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
