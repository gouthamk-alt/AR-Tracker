import React, { useMemo } from 'react';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';

interface InspectorDateHeatmapProps {
  rows: InspectionRow[];
  onSelectCell?: (inspector: string, dateStr: string) => void;
  isDark?: boolean;
}

export const InspectorDateHeatmap: React.FC<InspectorDateHeatmapProps> = ({
  rows,
  onSelectCell,
  isDark,
}) => {
  const { inspectors, dates, matrix, maxCount } = useMemo(() => {
    const inspSet = new Set<string>();
    const dateSet = new Set<string>();
    const grid: Record<string, Record<string, number>> = {};
    let max = 0;

    rows.forEach((r) => {
      const insp = r.inspector || 'Unassigned';
      const d = r.dateStr;
      if (!d) return;

      inspSet.add(insp);
      dateSet.add(d);

      if (!grid[insp]) grid[insp] = {};
      grid[insp][d] = (grid[insp][d] || 0) + 1;
      if (grid[insp][d] > max) {
        max = grid[insp][d];
      }
    });

    const sortedInspectors = Array.from(inspSet).sort();
    const sortedDates = Array.from(dateSet).sort();

    return {
      inspectors: sortedInspectors,
      dates: sortedDates,
      matrix: grid,
      maxCount: Math.max(max, 1),
    };
  }, [rows]);

  const getCellShade = (count: number) => {
    if (!count) {
      return isDark
        ? 'bg-slate-800/40 text-slate-600 hover:bg-slate-700/60'
        : 'bg-slate-50 text-slate-300 hover:bg-slate-100';
    }
    const ratio = count / maxCount;
    if (ratio <= 0.25) {
      return isDark
        ? 'bg-sky-950/70 text-sky-200 hover:bg-sky-900 border border-sky-800/40'
        : 'bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-200';
    }
    if (ratio <= 0.5) {
      return isDark
        ? 'bg-sky-800/80 text-white hover:bg-sky-700'
        : 'bg-sky-300 text-sky-950 hover:bg-sky-400';
    }
    if (ratio <= 0.75) {
      return isDark
        ? 'bg-sky-600 text-white hover:bg-sky-500 font-bold'
        : 'bg-sky-500 text-white hover:bg-sky-600 font-bold';
    }
    return isDark
      ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 font-extrabold shadow-sm'
      : 'bg-sky-700 text-white hover:bg-sky-800 font-extrabold shadow-sm';
  };

  const csvHeaders = ['Inspector', ...dates];
  const csvRows = inspectors.map((insp) => [
    insp,
    ...dates.map((d) => (matrix[insp] && matrix[insp][d]) || 0),
  ]);

  return (
    <ChartCard
      title="Inspector × Date Heatmap"
      subtitle="Workload density across inspectors and calendar days (click cell to cross-filter)"
      csvFilename="inspector_date_heatmap"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {inspectors.length === 0 || dates.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No workload matrix data for selected filters
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto max-w-full pb-2">
            <div className="inline-block min-w-full align-middle">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                      Inspector
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="px-2 py-2 text-center font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 min-w-[44px]"
                      >
                        <span className="block text-[10px]">{d.slice(5)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectors.map((insp) => (
                    <tr key={insp} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 font-medium text-slate-900 dark:text-slate-200 whitespace-nowrap border-r border-slate-100 dark:border-slate-800 shadow-xs">
                        {insp}
                      </td>
                      {dates.map((d) => {
                        const count = (matrix[insp] && matrix[insp][d]) || 0;
                        return (
                          <td key={d} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (count > 0) {
                                  onSelectCell?.(insp, d);
                                }
                              }}
                              className={`w-9 h-7 rounded-md flex items-center justify-center text-[11px] transition-all ${getCellShade(
                                count
                              )} ${count > 0 ? 'cursor-pointer scale-100 active:scale-95' : 'cursor-default'}`}
                              title={`${insp} on ${d}: ${count} inspection${count === 1 ? '' : 's'}`}
                            >
                              {count > 0 ? count : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heat Legend */}
          <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Fewer</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <span className="w-3.5 h-3.5 rounded bg-sky-200 dark:bg-sky-900" />
              <span className="w-3.5 h-3.5 rounded bg-sky-400 dark:bg-sky-700" />
              <span className="w-3.5 h-3.5 rounded bg-sky-600 dark:bg-sky-500" />
              <span className="w-3.5 h-3.5 rounded bg-sky-800 dark:bg-sky-300" />
            </div>
            <span>More</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
};
