import React from 'react';
import { HelpCircle, X, Calculator, Calendar, Building, Sparkles } from 'lucide-react';

interface DefinitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DefinitionsModal: React.FC<DefinitionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">How Numbers Are Calculated</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Standard business definitions & inspection logic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <Building className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">One row equals one inspection:</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                Routine to-dos are already expanded to one row per address. Every single property visit counts as 1 inspection.
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Period Presets (Week = Sun to Sat):</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                "This week" spans the full calendar week (Sunday to Saturday) containing today's date. "This month" spans the full current calendar month (1st through last day). "Average per working day" divides total inspections by unique scheduled calendar days.
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Previous period comparison:</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                Calculated using the exact same number of calendar days immediately preceding the current selected date range (e.g., prior 7 days or prior month).
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Data Normalisation:</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                Inspectors, Agencies, and Managers that are entirely UPPERCASE (e.g. "TAYLA D" or "MARK HAY REALTY") are converted to Title Case. Mixed-case values and acronyms (such as DGRE, BW, HKY) are preserved exactly as written.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
