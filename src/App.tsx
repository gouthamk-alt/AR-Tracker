/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { DetailTable } from './components/DetailTable';
import { DataQualityPanel } from './components/DataQualityPanel';
import { AgencyBreakdownSection } from './components/AgencyBreakdownSection';
import { DefinitionsModal } from './components/DefinitionsModal';
import { PasteDataModal } from './components/PasteDataModal';

// Charts (redundant ones removed per instructions)
import { InspectionsPerDayChart } from './components/charts/InspectionsPerDayChart';
import { InspectorWorkloadChart } from './components/charts/InspectorWorkloadChart';
import { TypeMixDonutChart } from './components/charts/TypeMixDonutChart';
import { InspectorDateHeatmap } from './components/charts/InspectorDateHeatmap';
import { DayOfWeekPatternChart } from './components/charts/DayOfWeekPatternChart';
import { SizeDistributionChart } from './components/charts/SizeDistributionChart';

import { fetchInspectionData } from './data/dataService';
import { InspectionRow, DataQualityReport } from './types';
import { useFilterState } from './hooks/useFilterState';
import { filterRows, calculateKpis, isExcludedStatus } from './utils/filterEngine';
import { getPresetDates } from './utils/dateUtils';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function App() {
  const [allRows, setAllRows] = useState<InspectionRow[]>([]);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [isSampleData, setIsSampleData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [isCustomData, setIsCustomData] = useState(false);
  // Excluded counts & Data quality tools hidden by default
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleToggleDiagnostics = () => {
    setShowDiagnostics((prev) => {
      const next = !prev;
      if (!next) {
        setQualityPanelOpen(false);
      }
      return next;
    });
  };

  const handleImportCustomRows = (rows: InspectionRow[], report: DataQualityReport) => {
    setAllRows(rows);
    setQualityReport(report);
    setIsSampleData(false);
    setIsCustomData(true);
    setLastRefreshed(new Date());
  };

  // Dark/Light theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inspection_tracker_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('inspection_tracker_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('inspection_tracker_theme', 'light');
    }
  }, [isDark]);

  // Load inspection data
  const loadData = useCallback(async (forceSample = false) => {
    setIsLoading(true);
    try {
      const result = await fetchInspectionData(forceSample);
      setAllRows(result.rows);
      setQualityReport(result.qualityReport);
      setIsSampleData(result.isSampleData);
      setIsCustomData(false);
      setLastRefreshed(result.loadedAt);
    } catch (err) {
      console.error('Failed to load inspection data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 minutes (600,000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter State Hook
  const {
    filters,
    updateFilters,
    clearAllFilters,
    toggleInspector,
    toggleAgency,
    toggleManager,
    toggleType,
    toggleSource,
    toggleStatus,
    toggleIncludeExcludedStatuses,
    filterOnlyStatus,
    toggleSize,
    toggleWeekday,
    setSearchQuery,
    toggleOnlyIssues,
    addCrossFilter,
    activeFilterCount,
  } = useFilterState();

  // Filtered rows
  const filteredRows = useMemo(() => {
    return filterRows(allRows, filters);
  }, [allRows, filters]);

  // KPI Metrics
  const metrics = useMemo(() => {
    return calculateKpis(filteredRows, allRows, filters);
  }, [filteredRows, allRows, filters]);

  // Excluded statuses counts (Cancelled, Duplicate, Ignored)
  const { cancelledCount, duplicateCount, ignoredCount } = useMemo(() => {
    let c = 0;
    let d = 0;
    let i = 0;
    allRows.forEach((r) => {
      const st = (r.status || '').toLowerCase().trim();
      if (st === 'cancelled') c++;
      else if (st === 'duplicate') d++;
      else if (st === 'ignored') i++;
    });
    return { cancelledCount: c, duplicateCount: d, ignoredCount: i };
  }, [allRows]);

  // Issues count (only rows with non-empty Check, excluding Cancelled/Duplicate/Ignored unless toggle is on)
  const issuesCount = useMemo(() => {
    return allRows.filter((r) => {
      if (!r.check || !r.check.trim()) return false;
      if (!filters.includeExcludedStatuses && isExcludedStatus(r.status)) return false;
      return true;
    }).length;
  }, [allRows, filters.includeExcludedStatuses]);

  // Calculate effective date range span in days
  const dateRangeDays = useMemo(() => {
    let from = filters.dateFrom;
    let to = filters.dateTo;
    if (filters.datePreset !== 'all' && filters.datePreset !== 'custom' && !from && !to) {
      const presetDates = getPresetDates(filters.datePreset);
      from = presetDates.from;
      to = presetDates.to;
    }
    if (from && to) {
      const [y1, m1, d1] = from.split('-').map(Number);
      const [y2, m2, d2] = to.split('-').map(Number);
      if (y1 && m1 && d1 && y2 && m2 && d2) {
        const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
        const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
        return Math.round(Math.abs(dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    // If 'all' or open-ended, check span of dates in allRows
    if (allRows.length > 0) {
      let minDateStr = '';
      let maxDateStr = '';
      allRows.forEach((r) => {
        if (r.dateStr) {
          if (!minDateStr || r.dateStr < minDateStr) minDateStr = r.dateStr;
          if (!maxDateStr || r.dateStr > maxDateStr) maxDateStr = r.dateStr;
        }
      });
      if (minDateStr && maxDateStr) {
        const [y1, m1, d1] = minDateStr.split('-').map(Number);
        const [y2, m2, d2] = maxDateStr.split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
        const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
        return Math.round(Math.abs(dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    return 0;
  }, [filters.dateFrom, filters.dateTo, filters.datePreset, allRows]);

  // Freshness indicators: Newest Date & Newest "To-do updated"
  const { newestDateFormatted, newestTodoUpdatedFormatted } = useMemo(() => {
    if (allRows.length === 0) {
      return { newestDateFormatted: '—', newestTodoUpdatedFormatted: '—' };
    }

    let maxDateStr = '';
    let maxRawDate = '';
    let maxTodoUpdatedTs = 0;
    let maxTodoUpdatedRaw = '';

    allRows.forEach((r) => {
      // Find latest Date
      if (r.dateStr && (!maxDateStr || r.dateStr > maxDateStr)) {
        maxDateStr = r.dateStr;
        maxRawDate = r.rawDate || r.dateStr;
      }

      // Find latest To-do updated
      if (r.todoUpdated) {
        const ts = Date.parse(r.todoUpdated);
        if (!isNaN(ts)) {
          if (ts > maxTodoUpdatedTs) {
            maxTodoUpdatedTs = ts;
            maxTodoUpdatedRaw = r.todoUpdated;
          }
        } else if (!maxTodoUpdatedRaw) {
          maxTodoUpdatedRaw = r.todoUpdated;
        }
      }
    });

    const newestDate = maxRawDate || maxDateStr || '—';

    let newestTodoUpdated = '—';
    if (maxTodoUpdatedTs > 0) {
      const d = new Date(maxTodoUpdatedTs);
      try {
        newestTodoUpdated = new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Perth',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      } catch {
        newestTodoUpdated = d.toLocaleString();
      }
    } else if (maxTodoUpdatedRaw) {
      newestTodoUpdated = maxTodoUpdatedRaw;
    }

    return {
      newestDateFormatted: newestDate,
      newestTodoUpdatedFormatted: newestTodoUpdated,
    };
  }, [allRows]);

  // Rule 5: Show "Day of Week Pattern" only when the selected range is 21 days or longer
  const showDayOfWeekPattern = dateRangeDays >= 21;

  return (
    <div className={isDark ? 'dark min-h-screen bg-slate-950 text-slate-100' : 'min-h-screen bg-slate-50/60 text-slate-900'}>
      {/* Top Navbar */}
      <Header
        totalLoaded={allRows.length}
        newestDate={newestDateFormatted}
        newestTodoUpdated={newestTodoUpdatedFormatted}
        isSampleData={isSampleData}
        isLoading={isLoading}
        lastRefreshed={lastRefreshed}
        onRefresh={() => loadData(false)}
        onToggleSample={() => loadData(!isSampleData)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenDefinitions={() => setDefinitionsOpen(true)}
        issuesCount={issuesCount}
        onOpenQualityPanel={() => setQualityPanelOpen(!qualityPanelOpen)}
        qualityPanelOpen={qualityPanelOpen}
        cancelledCount={cancelledCount}
        duplicateCount={duplicateCount}
        ignoredCount={ignoredCount}
        onFilterOnlyStatus={filterOnlyStatus}
        showDiagnostics={showDiagnostics}
        onToggleDiagnostics={handleToggleDiagnostics}
        onOpenPasteModal={() => setPasteModalOpen(true)}
        isCustomData={isCustomData}
      />

      {/* Sticky Filter Bar */}
      <FilterBar
        allRows={allRows}
        filters={filters}
        updateFilters={updateFilters}
        clearAllFilters={clearAllFilters}
        toggleInspector={toggleInspector}
        toggleAgency={toggleAgency}
        toggleManager={toggleManager}
        toggleType={toggleType}
        toggleSource={toggleSource}
        toggleStatus={toggleStatus}
        toggleIncludeExcludedStatuses={toggleIncludeExcludedStatuses}
        toggleSize={toggleSize}
        toggleWeekday={toggleWeekday}
        setSearchQuery={setSearchQuery}
        toggleOnlyIssues={toggleOnlyIssues}
        activeFilterCount={activeFilterCount}
        showDiagnostics={showDiagnostics}
        onToggleDiagnostics={handleToggleDiagnostics}
      />

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Data Quality Panel (collapsible) */}
        <DataQualityPanel
          rows={allRows}
          includeExcludedStatuses={filters.includeExcludedStatuses}
          isOpen={qualityPanelOpen}
          onClose={() => setQualityPanelOpen(false)}
        />

        {/* Loading Skeleton */}
        {isLoading && allRows.length === 0 ? (
          <div className="space-y-6 animate-pulse py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <KpiCards
              metrics={metrics}
              onFilterByInspector={(name) => addCrossFilter('inspector', name)}
              onFilterByAgency={(agency) => addCrossFilter('agency', agency)}
              onFilterByDate={(dateStr) => addCrossFilter('date', dateStr)}
            />

            {/* Empty state if 0 rows */}
            {filteredRows.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No inspections match your active filters
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Try broadening your date range or clearing some of the selected inspectors, agencies, or keywords.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <>
                {/* Visual Charts Grid */}
                <div className="space-y-6">
                  {/* Row 1: Inspections Over Time (with Routine/Non-routine stacking option) */}
                  <div>
                    <InspectionsPerDayChart
                      rows={filteredRows}
                      onSelectDate={(dateStr) => addCrossFilter('date', dateStr)}
                      isDark={isDark}
                    />
                  </div>

                  {/* Row 2: By Inspector & Type Mix */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InspectorWorkloadChart
                      rows={filteredRows}
                      onSelectInspector={(name) => addCrossFilter('inspector', name)}
                      isDark={isDark}
                    />
                    <TypeMixDonutChart
                      rows={filteredRows}
                      onSelectType={(type) => addCrossFilter('type', type)}
                      isDark={isDark}
                    />
                  </div>

                  {/* Row 3: Inspector x Date Heatmap */}
                  <InspectorDateHeatmap
                    rows={filteredRows}
                    onSelectCell={(inspector, dateStr) => {
                      addCrossFilter('inspector', inspector);
                      addCrossFilter('date', dateStr);
                    }}
                    isDark={isDark}
                  />

                  {/* Row 4: Day of Week Pattern (conditional >= 21 days) & Property Size Distribution */}
                  {showDayOfWeekPattern ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <DayOfWeekPatternChart
                        rows={filteredRows}
                        onSelectWeekday={(wd) => toggleWeekday(wd)}
                        isDark={isDark}
                      />
                      <SizeDistributionChart
                        rows={filteredRows}
                        onSelectSize={(size) => addCrossFilter('size', size)}
                        isDark={isDark}
                      />
                    </div>
                  ) : (
                    <div>
                      <SizeDistributionChart
                        rows={filteredRows}
                        onSelectSize={(size) => addCrossFilter('size', size)}
                        isDark={isDark}
                      />
                    </div>
                  )}
                </div>

                {/* Agency Breakdown by Report Type Section (includes table and horizontal stacked bar chart) */}
                <AgencyBreakdownSection
                  rows={filteredRows}
                  onSelectAgency={(agency) => addCrossFilter('agency', agency)}
                  isDark={isDark}
                />

                {/* Detail Records Table */}
                <DetailTable rows={filteredRows} isDark={isDark} />
              </>
            )}
          </>
        )}
      </main>

      {/* Definitions Modal */}
      <DefinitionsModal
        isOpen={definitionsOpen}
        onClose={() => setDefinitionsOpen(false)}
      />

      {/* Paste / Import Data Modal */}
      <PasteDataModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        onImport={handleImportCustomRows}
      />
    </div>
  );
}
