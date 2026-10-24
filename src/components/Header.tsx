import React from 'react';
import { 
  RefreshCw, 
  Moon, 
  Sun, 
  HelpCircle, 
  AlertTriangle, 
  Database,
  Building2,
  Clock,
  Calendar
} from 'lucide-react';

interface HeaderProps {
  totalLoaded: number;
  newestDate: string;
  newestTodoUpdated: string;
  isSampleData: boolean;
  isLoading: boolean;
  lastRefreshed: Date;
  onRefresh: () => void;
  onToggleSample: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenDefinitions: () => void;
  issuesCount: number;
  onOpenQualityPanel: () => void;
  qualityPanelOpen: boolean;
  cancelledCount: number;
  duplicateCount: number;
  ignoredCount: number;
  onFilterOnlyStatus: (status: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalLoaded,
  newestDate,
  newestTodoUpdated,
  isSampleData,
  isLoading,
  lastRefreshed,
  onRefresh,
  isDark,
  onToggleTheme,
  onOpenDefinitions,
  issuesCount,
  onOpenQualityPanel,
  qualityPanelOpen,
  cancelledCount,
  duplicateCount,
  ignoredCount,
  onFilterOnlyStatus,
}) => {
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 20) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors">
      {/* Sample Data Banner */}
      {isSampleData && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px]">!</span>
            <span>
              <strong>Showing sample data</strong> — Google Sheets live CSV feed could not be reached directly. Realistic Perth inspection dataset loaded.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="text-xs font-semibold underline hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
            >
              Retry live connection
            </button>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Property Inspection Tracker
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Analytics
              </span>
            </div>

            {/* Freshness Information: Rows loaded, Newest Date, Newest To-do Updated */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              {/* Rows Loaded */}
              <span className="inline-flex items-center gap-1 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalLoaded.toLocaleString()}</span> rows loaded
              </span>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              {/* Newest Date */}
              <span className="inline-flex items-center gap-1 font-medium" title="Newest inspection date found in the dataset">
                <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Newest date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{newestDate || '—'}</span>
              </span>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              {/* Newest To-do Updated */}
              <span className="inline-flex items-center gap-1 font-medium" title="Newest Basecamp 'To-do updated' timestamp in the dataset">
                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Newest To-do updated:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{newestTodoUpdated || '—'}</span>
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

              {/* Excluded by status */}
              <span className="text-amber-700 dark:text-amber-400 font-medium hidden sm:inline">
                {(cancelledCount + duplicateCount + ignoredCount).toLocaleString()} excluded
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>

              {/* Refreshed time */}
              <span className="hidden md:inline text-slate-400 dark:text-slate-500">
                Fetched {formatTimeAgo(lastRefreshed)}
              </span>
            </div>
          </div>
        </div>

        {/* Small Excluded Status Quick Chips */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Excluded:
          </span>
          <button
            type="button"
            onClick={() => onFilterOnlyStatus('Cancelled')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
            title="Click to view only cancelled inspections"
          >
            {cancelledCount} cancelled
          </button>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <button
            type="button"
            onClick={() => onFilterOnlyStatus('Duplicate')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-900/60 transition-colors"
            title="Click to view only duplicate inspections"
          >
            {duplicateCount} duplicates
          </button>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <button
            type="button"
            onClick={() => onFilterOnlyStatus('Ignored')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors"
            title="Click to view only ignored inspections"
          >
            {ignoredCount} ignored
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Data Quality Toggle */}
          <button
            onClick={onOpenQualityPanel}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              issuesCount > 0
                ? qualityPanelOpen
                  ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
            title="Inspect rows with Check warnings"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${issuesCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Data Quality</span>
            {issuesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {issuesCount}
              </span>
            )}
          </button>

          {/* Definitions Modal Trigger with tooltip */}
          <button
            onClick={onOpenDefinitions}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title="One row equals one property inspection. Routine to-dos are already expanded to one row per address. &quot;Per day&quot; counts rows by Date."
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden md:inline">How numbers are calculated</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs shadow-sky-600/20 transition-all disabled:opacity-60"
            title="Refresh inspection data (auto-refreshes every 10 min, bypasses cache)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            aria-label="Toggle theme"
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
