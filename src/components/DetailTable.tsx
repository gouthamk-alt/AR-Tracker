import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Building,
  Check,
} from 'lucide-react';
import { InspectionRow } from '../types';
import { downloadCsv } from '../utils/csvExport';
import { getTypeColor } from '../constants/theme';

interface DetailTableProps {
  rows: InspectionRow[];
  isDark?: boolean;
}

type SortField =
  | 'date'
  | 'inspector'
  | 'agency'
  | 'manager'
  | 'address'
  | 'type'
  | 'size'
  | 'jobRef'
  | 'status'
  | 'source'
  | 'note';

interface ColumnDef {
  key: string;
  label: string;
  sortField?: SortField;
  defaultVisible: boolean;
}

const AVAILABLE_COLUMNS: ColumnDef[] = [
  { key: 'date', label: 'Date', sortField: 'date', defaultVisible: true },
  { key: 'inspector', label: 'Inspector', sortField: 'inspector', defaultVisible: true },
  { key: 'agency', label: 'Agency', sortField: 'agency', defaultVisible: true },
  { key: 'manager', label: 'Manager', sortField: 'manager', defaultVisible: true },
  { key: 'address', label: 'Address', sortField: 'address', defaultVisible: true },
  { key: 'type', label: 'Type', sortField: 'type', defaultVisible: true },
  { key: 'size', label: 'Size', sortField: 'size', defaultVisible: true },
  { key: 'jobRef', label: 'Job Ref', sortField: 'jobRef', defaultVisible: true },
  { key: 'status', label: 'Status', sortField: 'status', defaultVisible: true },
  { key: 'source', label: 'Source', sortField: 'source', defaultVisible: true },
  { key: 'note', label: 'Note', sortField: 'note', defaultVisible: true },
  { key: 'link', label: 'Basecamp', defaultVisible: true },
];

export const DetailTable: React.FC<DetailTableProps> = ({ rows }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showColSettings, setShowColSettings] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      map[col.key] = col.defaultVisible;
    });
    return map;
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof InspectionRow] || '';
      let bVal: any = b[sortField as keyof InspectionRow] || '';

      if (sortField === 'date') {
        aVal = a.date ? a.date.getTime() : 0;
        bVal = b.date ? b.date.getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const handleExportFiltered = () => {
    const headers = [
      'Date',
      'Inspector',
      'Agency',
      'Manager',
      'Address',
      'Type',
      'Size',
      'Job ref',
      'Status',
      'Source',
      'Note',
      'Link',
      'Raw title',
      'Check',
    ];
    const exportRows = sortedRows.map((r) => [
      r.rawDate || r.dateStr,
      r.inspector,
      r.agency,
      r.manager,
      r.address,
      r.type,
      r.size,
      r.jobRef,
      r.status,
      r.source,
      r.note,
      r.link,
      r.rawTitle,
      r.check,
    ]);
    downloadCsv('filtered_inspections', headers, exportRows);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
      {/* Top action header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Inspections Detail Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {sortedRows.length} matching inspection{sortedRows.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Column Visibility Toggle */}
          <button
            type="button"
            onClick={() => setShowColSettings(!showColSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Columns</span>
          </button>

          {/* Column Settings Dropdown */}
          {showColSettings && (
            <div className="absolute right-0 top-10 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 text-xs animate-in fade-in duration-150">
              <div className="font-semibold text-slate-900 dark:text-white pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                Visible Columns
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {AVAILABLE_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    <span>{col.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(visibleColumns[col.key])}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 border-slate-300"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportFiltered}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs shadow-sky-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
            <tr>
              {AVAILABLE_COLUMNS.map((col) => {
                if (!visibleColumns[col.key]) return null;

                const isCurrentSort = sortField === col.sortField;

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortField && handleSort(col.sortField)}
                    className={`px-3.5 py-3 ${
                      col.sortField ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60' : ''
                    } whitespace-nowrap`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortField && (
                        <span className="text-slate-400">
                          {isCurrentSort ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[3]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[3]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={AVAILABLE_COLUMNS.length}
                  className="px-4 py-12 text-center text-slate-400 text-xs"
                >
                  No inspections match your active filters. Try resetting some filters or search keywords.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const typeStyle = getTypeColor(row.type);
                return (
                  <tr
                    key={row.id ? `${row.id}_${idx}` : `row_${page}_${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Date */}
                    {visibleColumns.date && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          {row.check && (
                            <span
                              className="text-amber-500"
                              title={`Check warning: ${row.check}`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span>{row.rawDate || row.dateStr}</span>
                        </div>
                      </td>
                    )}

                    {/* Inspector */}
                    {visibleColumns.inspector && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium">
                        {row.inspector || <span className="text-slate-400 italic">None</span>}
                      </td>
                    )}

                    {/* Agency */}
                    {visibleColumns.agency && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {row.agency || <span className="text-slate-400 italic">None</span>}
                      </td>
                    )}

                    {/* Manager */}
                    {visibleColumns.manager && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {row.manager || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    )}

                    {/* Address */}
                    {visibleColumns.address && (
                      <td className="px-3.5 py-2.5 max-w-xs truncate text-slate-800 dark:text-slate-200">
                        <span title={row.address}>{row.address || '—'}</span>
                      </td>
                    )}

                    {/* Type */}
                    {visibleColumns.type && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: typeStyle.hex }}
                          />
                          {row.type}
                        </span>
                      </td>
                    )}

                    {/* Size */}
                    {visibleColumns.size && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {row.size || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    )}

                    {/* Job Ref */}
                    {visibleColumns.jobRef && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {row.jobRef || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.status && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            row.status.toLowerCase() === 'done'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    )}

                    {/* Source */}
                    {visibleColumns.source && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {row.source}
                      </td>
                    )}

                    {/* Note */}
                    {visibleColumns.note && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {row.note ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {row.note}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}

                    {/* Link */}
                    {visibleColumns.link && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                        {row.link ? (
                          <a
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                            title="Open in Basecamp"
                          >
                            <span>Basecamp</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline">
            Page {page} of {totalPages} ({sortedRows.length} total rows)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-slate-700 dark:text-slate-200">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
