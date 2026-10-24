import React, { useMemo } from 'react';
import { InspectionRow } from '../../types';
import { ChartCard } from '../ChartCard';
import { downloadCsv } from '../../utils/csvExport';

interface AgencyTypeMatrixTableProps {
  rows: InspectionRow[];
  onSelectAgency?: (name: string) => void;
  onSelectType?: (type: string) => void;
  isDark?: boolean;
}

export const AgencyTypeMatrixTable: React.FC<AgencyTypeMatrixTableProps> = ({
  rows,
  onSelectAgency,
  onSelectType,
  isDark,
}) => {
  const { agencies, types, matrix, maxVal } = useMemo(() => {
    const agencySet = new Set<string>();
    const typeSet = new Set<string>();
    const grid: Record<string, Record<string, number>> = {};
    const agencyTotals: Record<string, number> = {};
    let max = 0;

    rows.forEach((r) => {
      const a = r.agency || 'Unknown Agency';
      let t = (r.type || '').trim().toUpperCase();
      if (t.includes('ROUTINE') || r.source === 'Routine') {
        t = 'ROUTINE';
      } else if (!t) {
        t = 'PCR';
      }
      agencySet.add(a);
      typeSet.add(t);

      if (!grid[a]) grid[a] = {};
      grid[a][t] = (grid[a][t] || 0) + 1;
      agencyTotals[a] = (agencyTotals[a] || 0) + 1;

      if (grid[a][t] > max) {
        max = grid[a][t];
      }
    });

    const standardTypes = ['PCR', 'PCR PHOTOS ONLY', 'INVENTORY', 'FINAL BOND', 'ROUTINE'];
    const otherTypes = Array.from(typeSet).filter((t) => !standardTypes.includes(t));
    const allTypes = [...standardTypes.filter((t) => typeSet.has(t)), ...otherTypes];

    const sortedAgencies = Array.from(agencySet).sort((a, b) => {
      return (agencyTotals[b] || 0) - (agencyTotals[a] || 0);
    });

    return {
      agencies: sortedAgencies,
      types: allTypes,
      matrix: grid,
      maxVal: Math.max(max, 1),
    };
  }, [rows]);

  const getHeatColor = (count: number) => {
    if (!count) return isDark ? 'text-slate-600 bg-transparent' : 'text-slate-300 bg-transparent';
    const ratio = count / maxVal;
    if (ratio <= 0.2) {
      return isDark ? 'bg-sky-950/60 text-sky-300 font-medium' : 'bg-sky-50 text-sky-800 font-medium';
    }
    if (ratio <= 0.4) {
      return isDark ? 'bg-sky-900/70 text-sky-200 font-semibold' : 'bg-sky-100 text-sky-900 font-semibold';
    }
    if (ratio <= 0.7) {
      return isDark ? 'bg-sky-700/80 text-white font-bold' : 'bg-sky-300 text-sky-950 font-bold';
    }
    return isDark ? 'bg-sky-500 text-slate-950 font-extrabold' : 'bg-sky-600 text-white font-extrabold';
  };

  const csvHeaders = ['Agency', ...types, 'Total'];
  const csvRows = agencies.map((a) => {
    let rowTotal = 0;
    const typeCounts = types.map((t) => {
      const c = (matrix[a] && matrix[a][t]) || 0;
      rowTotal += c;
      return c;
    });
    return [a, ...typeCounts, rowTotal];
  });

  return (
    <ChartCard
      title="Agency × Type Matrix"
      subtitle="Cross-tabulation of agencies against inspection types with heat concentration"
      csvFilename="agency_type_matrix"
      csvHeaders={csvHeaders}
      csvRows={csvRows}
    >
      {agencies.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          No matrix data for selected filters
        </div>
      ) : (
        <div className="overflow-x-auto max-w-full max-h-[340px] rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-20 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800/90 shadow-xs">
                  Agency
                </th>
                {types.map((t) => (
                  <th
                    key={t}
                    onClick={() => onSelectType?.(t)}
                    className="px-3 py-2.5 text-center cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap"
                    title={`Click to filter by ${t}`}
                  >
                    {t}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {agencies.map((a) => {
                let rowSum = 0;
                return (
                  <tr key={a} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td
                      onClick={() => onSelectAgency?.(a)}
                      className="px-3 py-2 font-medium sticky left-0 z-10 bg-white dark:bg-slate-900 cursor-pointer text-slate-900 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 whitespace-nowrap shadow-xs"
                      title={`Click to filter by ${a}`}
                    >
                      {a}
                    </td>
                    {types.map((t) => {
                      const count = (matrix[a] && matrix[a][t]) || 0;
                      rowSum += count;
                      return (
                        <td key={t} className="p-1 text-center">
                          <div
                            className={`w-full py-1 rounded-md text-center transition-all ${getHeatColor(
                              count
                            )}`}
                          >
                            {count > 0 ? count : '—'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white">
                      {rowSum}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
};
