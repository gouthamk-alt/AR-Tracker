import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { parsePastedOrCustomData } from '../data/dataService';
import { InspectionRow, DataQualityReport } from '../types';

interface PasteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: InspectionRow[], qualityReport: DataQualityReport) => void;
}

export const PasteDataModal: React.FC<PasteDataModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    setError(null);
    if (!text.trim()) {
      setError('Please paste some CSV or tab-separated rows.');
      return;
    }

    try {
      const { rows, qualityReport } = parsePastedOrCustomData(text);
      if (rows.length === 0) {
        setError('No valid inspection rows could be parsed from the provided text.');
        return;
      }
      onImport(rows, qualityReport);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse the pasted data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Import or Paste Inspection Data
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste tab-separated rows from Basecamp or Excel/Sheets (headers optional).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Automatic Date & Format Detection:
            </div>
            The parser automatically resolves dates from Date columns, Basecamp raw titles (<code className="font-mono text-sky-600 dark:text-sky-400">DD MM YYYY - ...</code>), or list names, and properly handles missing leading tab columns for routine batches.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Paste CSV or TSV Content:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="NATALIA F	RENTWEST SOLUTIONS		10 BILLERICAY CIRCUIT, BUTLER, WA, 6036	ROUTINE			Done	Routine	520977717	2026-10-19T11:26:27.000+08:00	ROUTINE INSPECTIONS	...	13 10 2026 - NATALIA F - ROUTINES - RENTWEST SOLUTIONS"
              rows={10}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setText('')}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Clear text
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              Load into Tracker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
