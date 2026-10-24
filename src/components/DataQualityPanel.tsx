import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  X,
  Copy,
  Check,
  ExternalLink,
  Info,
  Filter,
} from 'lucide-react';
import { InspectionRow } from '../types';
import { isExcludedStatus } from '../utils/filterEngine';

interface DataQualityPanelProps {
  rows: InspectionRow[];
  includeExcludedStatuses: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  rows,
  includeExcludedStatuses,
  isOpen,
  onClose,
}) => {
  const [selectedMessage, setSelectedMessage] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Eligible issues: only non-empty Check value, excluding Cancelled/Duplicate/Ignored unless toggle is on
  const issueRows = useMemo(() => {
    return rows.filter((r) => {
      if (!r.check || !r.check.trim()) return false;
      if (!includeExcludedStatuses && isExcludedStatus(r.status)) return false;
      return true;
    });
  }, [rows, includeExcludedStatuses]);

  // Group by check message with counts
  const checkMessageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    issueRows.forEach((r) => {
      const msg = r.check.trim();
      counts[msg] = (counts[msg] || 0) + 1;
    });
    return counts;
  }, [issueRows]);

  // Filtered rows for the table
  const displayedRows = useMemo(() => {
    if (selectedMessage === 'ALL') return issueRows;
    return issueRows.filter((r) => r.check.trim() === selectedMessage);
  }, [issueRows, selectedMessage]);

  if (!isOpen) return null;

  const handleCopySingle = async (todoId: string) => {
    if (!todoId) return;
    try {
      await navigator.clipboard.writeText(todoId);
      setCopiedId(todoId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyAll = async () => {
    const ids = displayedRows.map((r) => r.todoId).filter(Boolean);
    if (ids.length === 0) return;
    try {
      await navigator.clipboard.writeText(ids.join('\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl shadow-xl mb-6 overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-amber-500/10 dark:bg-amber-500/20 px-5 py-4 border-b border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Data Quality Panel
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {issueRows.length} flagged item{issueRows.length === 1 ? '' : 's'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspections with non-empty Check status {!includeExcludedStatuses && '(excluding Cancelled/Duplicate/Ignored)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy all To-do IDs Button */}
          {displayedRows.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-slate-700 transition-all shadow-2xs"
              title="Copy all visible To-do IDs to clipboard (one per line)"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Copied {displayedRows.length} IDs!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Copy all To-do IDs ({displayedRows.length})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors"
            aria-label="Close quality panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help Note */}
      <div className="px-5 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong>Help note:</strong> To fix a row, edit its title in Basecamp, or add its To-do ID to the Overrides tab of the sheet. This dashboard is read-only.
        </p>
      </div>

      {/* Filter / Group by Check message pills */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
          Filter by Check:
        </span>
        <button
          onClick={() => setSelectedMessage('ALL')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            selectedMessage === 'ALL'
              ? 'bg-amber-600 text-white font-bold shadow-2xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          All issues ({issueRows.length})
        </button>

        {Object.entries(checkMessageCounts).map(([msg, count]) => (
          <button
            key={msg}
            onClick={() => setSelectedMessage(msg)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedMessage === msg
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {msg} ({count})
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[420px]">
        {displayedRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No rows found with check warnings.
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 sticky top-0 z-20 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Check message</th>
                <th className="px-3.5 py-2.5">Raw title</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Date</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Inspector</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Agency</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap text-center">To-do ID</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Basecamp Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {displayedRows.map((row, idx) => (
                <tr key={row.id ? `${row.id}_${idx}` : `dq_${row.todoId || idx}_${idx}`} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Check message */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {row.check}
                    </span>
                  </td>

                  {/* Raw title */}
                  <td className="px-3.5 py-2.5 max-w-md font-mono text-[11px] text-slate-900 dark:text-slate-100 break-words">
                    {row.rawTitle || <span className="text-slate-400 italic">(blank title)</span>}
                  </td>

                  {/* Date */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.rawDate || row.dateStr}
                  </td>

                  {/* Inspector */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                    {row.inspector || '—'}
                  </td>

                  {/* Agency */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.agency || '—'}
                  </td>

                  {/* To-do ID + Copy button */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                    {row.todoId ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                        <span>#{row.todoId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySingle(row.todoId)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                          title="Copy To-do ID"
                        >
                          {copiedId === row.todoId ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Link */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                    {row.link ? (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:underline font-semibold"
                      >
                        <span>Open in Basecamp</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
