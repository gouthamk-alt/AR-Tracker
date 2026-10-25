import React, { useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  X, 
  Filter, 
  RotateCcw, 
  AlertCircle, 
  User, 
  Building, 
  Briefcase,
  Layers,
  CheckCircle2,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { FilterState, DatePreset, InspectionRow } from '../types';
import { getPresetDates, getPerthTodayString, formatPerthDisplayDate } from '../utils/dateUtils';
import { getFieldCounts } from '../utils/filterEngine';
import { FilterMultiSelect } from './FilterMultiSelect';
import { WEEKDAYS, getTypeColor } from '../constants/theme';

interface FilterBarProps {
  allRows: InspectionRow[];
  filters: FilterState;
  updateFilters: (updater: Partial<FilterState> | ((prev: FilterState) => FilterState)) => void;
  clearAllFilters: () => void;
  toggleInspector: (val: string) => void;
  toggleAgency: (val: string) => void;
  toggleManager: (val: string) => void;
  toggleType: (val: string) => void;
  toggleSource: (val: string) => void;
  toggleStatus: (val: string) => void;
  toggleIncludeExcludedStatuses: () => void;
  toggleSize: (val: string) => void;
  toggleWeekday: (val: number) => void;
  setSearchQuery: (val: string) => void;
  toggleOnlyIssues: () => void;
  activeFilterCount: number;
  showDiagnostics?: boolean;
  onToggleDiagnostics?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  allRows,
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
  toggleSize,
  toggleWeekday,
  setSearchQuery,
  toggleOnlyIssues,
  activeFilterCount,
  showDiagnostics = false,
  onToggleDiagnostics,
}) => {
  // Real current date in Australia/Perth timezone (never uses dataset max date)
  const perthTodayStr = useMemo(() => getPerthTodayString(), []);
  const perthTodayFormatted = useMemo(() => formatPerthDisplayDate(perthTodayStr), [perthTodayStr]);

  // Compute live option counts for all multi-selects based on other active filters
  const inspectorCounts = useMemo(() => getFieldCounts(allRows, filters, 'inspector'), [allRows, filters]);
  const agencyCounts = useMemo(() => getFieldCounts(allRows, filters, 'agency'), [allRows, filters]);
  const managerCounts = useMemo(() => getFieldCounts(allRows, filters, 'manager'), [allRows, filters]);
  const sizeCounts = useMemo(() => getFieldCounts(allRows, filters, 'size'), [allRows, filters]);
  const typeCounts = useMemo(() => getFieldCounts(allRows, filters, 'type'), [allRows, filters]);
  const statusCounts = useMemo(() => getFieldCounts(allRows, filters, 'status'), [allRows, filters]);

  const { cancelledCount, duplicateCount, ignoredCount } = useMemo(() => {
    let c = 0;
    let d = 0;
    let i = 0;
    allRows.forEach((r) => {
      const s = (r.status || '').toLowerCase().trim();
      if (s === 'cancelled') c++;
      else if (s === 'duplicate') d++;
      else if (s === 'ignored') i++;
    });
    return { cancelledCount: c, duplicateCount: d, ignoredCount: i };
  }, [allRows]);

  // Unique sorted options
  const inspectorOptions = useMemo(() => {
    const allInspectors = Array.from(new Set(allRows.map((r) => r.inspector).filter(Boolean)));
    return allInspectors
      .map((name) => ({
        label: name,
        value: name,
        count: inspectorCounts[name] || 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allRows, inspectorCounts]);

  const agencyOptions = useMemo(() => {
    const allAgencies = Array.from(new Set(allRows.map((r) => r.agency).filter(Boolean)));
    return allAgencies
      .map((name) => ({
        label: name,
        value: name,
        count: agencyCounts[name] || 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allRows, agencyCounts]);

  const managerOptions = useMemo(() => {
    const allManagers = Array.from(new Set(allRows.map((r) => r.manager).filter(Boolean)));
    return allManagers
      .map((name) => ({
        label: name,
        value: name,
        count: managerCounts[name] || 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allRows, managerCounts]);

  const sizeOptions = useMemo(() => {
    const allSizes = Array.from(new Set(allRows.map((r) => r.size).filter(Boolean)));
    return allSizes
      .map((size) => ({
        label: size,
        value: size,
        count: sizeCounts[size] || 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allRows, sizeCounts]);

  const statusOptions = useMemo(() => {
    const allFive = ['Open', 'Done', 'Cancelled', 'Duplicate', 'Ignored'];
    return allFive.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] || 0,
    }));
  }, [statusCounts]);

  // Date presets list (including Next 7 days and Upcoming)
  const datePresets: { id: DatePreset; label: string }[] = [
    { id: 'all', label: 'All time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This week' },
    { id: 'last_7_days', label: 'Last 7 days' },
    { id: 'last_14_days', label: 'Last 14 days' },
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'next_7_days', label: 'Next 7 days' },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === 'all') {
      updateFilters({ datePreset: 'all', dateFrom: '', dateTo: '' });
      return;
    }
    const { from, to } = getPresetDates(preset);
    updateFilters({
      datePreset: preset,
      dateFrom: from,
      dateTo: to,
    });
  };

  const inspectionTypes = ['PCR', 'PCR PHOTOS ONLY', 'INVENTORY', 'FINAL BOND', 'ROUTINE', 'COMMERCIAL'];

  return (
    <div className="sticky top-16 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Top Row: Date Presets & Manual inputs */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Preset Buttons & Perth Today Indicator */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 hidden lg:inline">
              Period:
            </span>

            {/* Visual Perth Today confirmation badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 mr-1 shadow-2xs"
              title="Real current calendar date in Australia/Perth timezone"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Perth today: <span className="font-bold underline decoration-emerald-400 underline-offset-2">{perthTodayFormatted}</span></span>
            </div>

            {datePresets.map((p) => {
              const isActive = filters.datePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/25 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Manual Date Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  updateFilters({
                    datePreset: 'custom',
                    dateFrom: e.target.value,
                  })
                }
                className="bg-transparent border-0 focus:outline-hidden text-xs text-slate-700 dark:text-slate-200"
                aria-label="From date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  updateFilters({
                    datePreset: 'custom',
                    dateTo: e.target.value,
                  })
                }
                className="bg-transparent border-0 focus:outline-hidden text-xs text-slate-700 dark:text-slate-200"
                aria-label="To date"
              />
              {(filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={() => updateFilters({ datePreset: 'all', dateFrom: '', dateTo: '' })}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear dates"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Clear All Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear all ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Dropdowns, Chips, Free Search, Weekday toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Free Text Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Address, Job ref, Title..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Inspector Dropdown */}
          <FilterMultiSelect
            label="Inspector"
            options={inspectorOptions}
            selectedValues={filters.inspectors}
            onToggle={toggleInspector}
            onClear={() => updateFilters({ inspectors: [] })}
            icon={<User className="w-3.5 h-3.5" />}
          />

          {/* Agency Dropdown */}
          <FilterMultiSelect
            label="Agency"
            options={agencyOptions}
            selectedValues={filters.agencies}
            onToggle={toggleAgency}
            onClear={() => updateFilters({ agencies: [] })}
            icon={<Building className="w-3.5 h-3.5" />}
          />

          {/* Manager Dropdown */}
          <FilterMultiSelect
            label="Manager"
            options={managerOptions}
            selectedValues={filters.managers}
            onToggle={toggleManager}
            onClear={() => updateFilters({ managers: [] })}
            icon={<Briefcase className="w-3.5 h-3.5" />}
          />

          {/* Size Dropdown */}
          <FilterMultiSelect
            label="Size"
            options={sizeOptions}
            selectedValues={filters.sizes}
            onToggle={toggleSize}
            onClear={() => updateFilters({ sizes: [] })}
            icon={<Layers className="w-3.5 h-3.5" />}
          />

          {/* Source Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
            <button
              onClick={() => updateFilters({ sources: [] })}
              className={`px-2 py-1 rounded-md transition-all font-medium ${
                filters.sources.length === 0
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => toggleSource('Date list')}
              className={`px-2 py-1 rounded-md transition-all font-medium ${
                filters.sources.includes('Date list')
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Date list
            </button>
            <button
              onClick={() => toggleSource('Routine')}
              className={`px-2 py-1 rounded-md transition-all font-medium ${
                filters.sources.includes('Routine')
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Routine
            </button>
          </div>

          {/* Status Multi-Select (All 5 values) */}
          <FilterMultiSelect
            label="Status"
            options={statusOptions}
            selectedValues={filters.statuses}
            onToggle={toggleStatus}
            onClear={() => updateFilters({ statuses: [] })}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          />

          {/* Simple Icon Toggle for Excluded & Data Quality in FilterBar */}
          {onToggleDiagnostics && (
            <button
              type="button"
              onClick={onToggleDiagnostics}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
                showDiagnostics
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={
                showDiagnostics
                  ? "Hide excluded & data quality filters"
                  : `Show excluded & data quality filters (${cancelledCount + duplicateCount + ignoredCount} excluded)`
              }
              aria-label={showDiagnostics ? "Hide excluded & data quality" : "Show excluded & data quality"}
            >
              {showDiagnostics ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline text-[11px] font-medium">
                {showDiagnostics ? "Hide diagnostics" : "Diagnostics"}
              </span>
            </button>
          )}

          {/* Excluded status controls & Data issues only (hidden by default) */}
          {showDiagnostics && (
            <>
              {/* Toggle: Include cancelled / duplicate / ignored & Quick counts */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleIncludeExcludedStatuses}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    filters.includeExcludedStatuses
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Toggle inclusion of Cancelled, Duplicate, and Ignored rows across dashboard"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
                      filters.includeExcludedStatuses
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'border-slate-400 dark:border-slate-600'
                    }`}
                  >
                    {filters.includeExcludedStatuses && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>Include cancelled / duplicate / ignored</span>
                </button>

                {/* Small counts near the filters: e.g. "13 cancelled · 72 duplicate · 0 ignored" */}
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'cancelled') {
                        updateFilters({ statuses: [] });
                      } else {
                        updateFilters({ statuses: ['Cancelled'] });
                      }
                    }}
                    className={`hover:text-rose-600 font-semibold transition-colors ${
                      filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'cancelled'
                        ? 'text-rose-600 dark:text-rose-400 underline font-bold'
                        : ''
                    }`}
                    title="Click to view only cancelled rows"
                  >
                    {cancelledCount} cancelled
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'duplicate') {
                        updateFilters({ statuses: [] });
                      } else {
                        updateFilters({ statuses: ['Duplicate'] });
                      }
                    }}
                    className={`hover:text-amber-600 font-semibold transition-colors ${
                      filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'duplicate'
                        ? 'text-amber-600 dark:text-amber-400 underline font-bold'
                        : ''
                    }`}
                    title="Click to view only duplicate rows"
                  >
                    {duplicateCount} duplicate
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'ignored') {
                        updateFilters({ statuses: [] });
                      } else {
                        updateFilters({ statuses: ['Ignored'] });
                      }
                    }}
                    className={`hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors ${
                      filters.statuses.length === 1 && filters.statuses[0].toLowerCase() === 'ignored'
                        ? 'text-sky-600 dark:text-sky-400 underline font-bold'
                        : ''
                    }`}
                    title="Click to view only ignored rows"
                  >
                    {ignoredCount} ignored
                  </button>
                </div>
              </div>

              {/* Only Issues Toggle */}
              <button
                onClick={toggleOnlyIssues}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  filters.onlyIssues
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Filter rows containing Check warnings"
              >
                <AlertCircle className={`w-3.5 h-3.5 ${filters.onlyIssues ? 'text-rose-500' : 'text-slate-400'}`} />
                <span>Data issues only</span>
              </button>
            </>
          )}
        </div>

        {/* Third Row: Type Chips & Weekday Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {/* Type Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Type:
            </span>
            {inspectionTypes.map((t) => {
              const isSelected = filters.types.includes(t);
              const color = getTypeColor(t);
              const count = typeCounts[t] || 0;
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? `${color.bg} ${color.text} ${color.border} ring-1 ring-sky-500/30`
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span>{t}</span>
                  <span className="text-[10px] opacity-75 font-semibold">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Weekday Toggles */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
              Days:
            </span>
            {WEEKDAYS.map((wd) => {
              const isSelected = filters.weekdays.includes(wd.id);
              return (
                <button
                  key={wd.id}
                  onClick={() => toggleWeekday(wd.id)}
                  title={wd.fullName}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {wd.name.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Removable active filter chips row */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Active:</span>

            {/* Date range chip */}
            {(filters.dateFrom || filters.dateTo || filters.datePreset !== 'all') && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-medium">
                <span>
                  Date: {filters.datePreset !== 'custom'
                    ? (datePresets.find((p) => p.id === filters.datePreset)?.label || filters.datePreset)
                    : 'Custom'}
                  {filters.dateFrom || filters.dateTo ? ` (${filters.dateFrom || 'start'} to ${filters.dateTo || 'ongoing'})` : ''}
                </span>
                <button
                  onClick={() => updateFilters({ datePreset: 'all', dateFrom: '', dateTo: '' })}
                  className="hover:text-rose-600 p-0.5"
                  title="Reset date filter to All time"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Inspectors chips */}
            {filters.inspectors.map((i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <span>Insp: {i}</span>
                <button onClick={() => toggleInspector(i)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Agencies chips */}
            {filters.agencies.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <span>Agency: {a}</span>
                <button onClick={() => toggleAgency(a)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Types chips */}
            {filters.types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <span>Type: {t}</span>
                <button onClick={() => toggleType(t)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Status chips */}
            {filters.statuses.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <span>Status: {s}</span>
                <button onClick={() => toggleStatus(s)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Included excluded statuses chip */}
            {filters.includeExcludedStatuses && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <span>Incl. cancelled / duplicates</span>
                <button onClick={toggleIncludeExcludedStatuses} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Sizes chips */}
            {filters.sizes.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <span>Size: {s}</span>
                <button onClick={() => toggleSize(s)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Weekdays */}
            {filters.weekdays.map((w) => {
              const wd = WEEKDAYS.find((d) => d.id === w);
              return (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <span>Day: {wd?.name}</span>
                  <button onClick={() => toggleWeekday(w)} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Search query chip */}
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                <span>"{filters.searchQuery}"</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Only issues chip */}
            {filters.onlyIssues && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                <span>With issues only</span>
                <button onClick={toggleOnlyIssues} className="hover:text-rose-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
