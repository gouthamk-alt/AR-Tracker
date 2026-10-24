import React, { useState } from 'react';
import { BarChart3, Table as TableIcon, Download } from 'lucide-react';
import { downloadCsv } from '../utils/csvExport';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  extraControls?: React.ReactNode;
  csvFilename: string;
  csvHeaders: string[];
  csvRows: (string | number)[][];
  children: React.ReactNode;
  tableContent?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  extraControls,
  csvFilename,
  csvHeaders,
  csvRows,
  children,
  tableContent,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const handleExportCsv = () => {
    downloadCsv(csvFilename, csvHeaders, csvRows);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {extraControls}

          {/* Chart / Table View Toggle */}
          {tableContent && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`p-1 rounded-md transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
                title="View as Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
                title="View as Data Table"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Export chart data to CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-4 flex-1 min-h-[280px]">
        {viewMode === 'chart' ? (
          children
        ) : (
          <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
            {tableContent ? (
              tableContent
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {csvRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
