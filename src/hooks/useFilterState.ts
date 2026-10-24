import { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterState, DatePreset } from '../types';
import { getPresetDates } from '../utils/dateUtils';

export const INITIAL_FILTER_STATE: FilterState = {
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  inspectors: [],
  agencies: [],
  managers: [],
  types: [],
  sources: [],
  statuses: [],
  includeExcludedStatuses: false,
  sizes: [],
  weekdays: [],
  searchQuery: '',
  onlyIssues: false,
};

function readFiltersFromUrl(): Partial<FilterState> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FilterState> = {};

  const preset = params.get('preset') as DatePreset | null;
  const from = params.get('from');
  const to = params.get('to');

  if (preset) {
    result.datePreset = preset;
    if (preset !== 'all' && preset !== 'custom') {
      const dates = getPresetDates(preset);
      result.dateFrom = from || dates.from;
      result.dateTo = to !== null ? to : dates.to;
    } else {
      if (from) result.dateFrom = from;
      if (to) result.dateTo = to;
    }
  } else {
    if (from) result.dateFrom = from;
    if (to) result.dateTo = to;
  }

  const inspectors = params.get('inspectors');
  if (inspectors) result.inspectors = Array.from(new Set(inspectors.split(',').filter(Boolean)));

  const agencies = params.get('agencies');
  if (agencies) result.agencies = Array.from(new Set(agencies.split(',').filter(Boolean)));

  const managers = params.get('managers');
  if (managers) result.managers = Array.from(new Set(managers.split(',').filter(Boolean)));

  const types = params.get('types');
  if (types) result.types = Array.from(new Set(types.split(',').filter(Boolean)));

  const sources = params.get('sources');
  if (sources) result.sources = Array.from(new Set(sources.split(',').filter(Boolean)));

  const statuses = params.get('statuses');
  if (statuses) result.statuses = Array.from(new Set(statuses.split(',').filter(Boolean)));

  const sizes = params.get('sizes');
  if (sizes) result.sizes = Array.from(new Set(sizes.split(',').filter(Boolean)));

  const weekdays = params.get('weekdays');
  if (weekdays) {
    result.weekdays = Array.from(
      new Set(
        weekdays
          .split(',')
          .map((w) => parseInt(w, 10))
          .filter((n) => !isNaN(n))
      )
    );
  }

  const q = params.get('q');
  if (q) result.searchQuery = q;

  const issues = params.get('issues');
  if (issues === '1' || issues === 'true') result.onlyIssues = true;

  const incExcluded = params.get('include_excluded');
  if (incExcluded === '1' || incExcluded === 'true') result.includeExcludedStatuses = true;

  return result;
}

function writeFiltersToUrl(state: FilterState) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();

  if (state.datePreset !== 'all') params.set('preset', state.datePreset);
  if (state.dateFrom) params.set('from', state.dateFrom);
  if (state.dateTo) params.set('to', state.dateTo);

  if (state.inspectors.length > 0) params.set('inspectors', state.inspectors.join(','));
  if (state.agencies.length > 0) params.set('agencies', state.agencies.join(','));
  if (state.managers.length > 0) params.set('managers', state.managers.join(','));
  if (state.types.length > 0) params.set('types', state.types.join(','));
  if (state.sources.length > 0) params.set('sources', state.sources.join(','));
  if (state.statuses.length > 0) params.set('statuses', state.statuses.join(','));
  if (state.includeExcludedStatuses) params.set('include_excluded', '1');
  if (state.sizes.length > 0) params.set('sizes', state.sizes.join(','));
  if (state.weekdays.length > 0) params.set('weekdays', state.weekdays.join(','));
  if (state.searchQuery.trim()) params.set('q', state.searchQuery.trim());
  if (state.onlyIssues) params.set('issues', '1');

  const queryString = params.toString();
  const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}

export function useFilterState() {
  const [filters, setFilters] = useState<FilterState>(() => {
    const fromUrl = readFiltersFromUrl();
    return {
      ...INITIAL_FILTER_STATE,
      ...fromUrl,
    };
  });

  // Sync to URL whenever filters change
  useEffect(() => {
    writeFiltersToUrl(filters);
  }, [filters]);

  const updateFilters = useCallback((updater: Partial<FilterState> | ((prev: FilterState) => FilterState)) => {
    setFilters((prev) => {
      if (typeof updater === 'function') {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  const toggleInspector = useCallback((inspector: string) => {
    setFilters((prev) => {
      const exists = prev.inspectors.includes(inspector);
      return {
        ...prev,
        inspectors: exists ? prev.inspectors.filter((i) => i !== inspector) : [...prev.inspectors, inspector],
      };
    });
  }, []);

  const toggleAgency = useCallback((agency: string) => {
    setFilters((prev) => {
      const exists = prev.agencies.includes(agency);
      return {
        ...prev,
        agencies: exists ? prev.agencies.filter((a) => a !== agency) : [...prev.agencies, agency],
      };
    });
  }, []);

  const toggleManager = useCallback((manager: string) => {
    setFilters((prev) => {
      const exists = prev.managers.includes(manager);
      return {
        ...prev,
        managers: exists ? prev.managers.filter((m) => m !== manager) : [...prev.managers, manager],
      };
    });
  }, []);

  const toggleType = useCallback((type: string) => {
    setFilters((prev) => {
      const exists = prev.types.includes(type);
      return {
        ...prev,
        types: exists ? prev.types.filter((t) => t !== type) : [...prev.types, type],
      };
    });
  }, []);

  const toggleSource = useCallback((source: string) => {
    setFilters((prev) => {
      const exists = prev.sources.includes(source);
      return {
        ...prev,
        sources: exists ? prev.sources.filter((s) => s !== source) : [...prev.sources, source],
      };
    });
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setFilters((prev) => {
      const exists = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: exists ? prev.statuses.filter((s) => s !== status) : [...prev.statuses, status],
      };
    });
  }, []);

  const toggleSize = useCallback((size: string) => {
    setFilters((prev) => {
      const exists = prev.sizes.includes(size);
      return {
        ...prev,
        sizes: exists ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
      };
    });
  }, []);

  const toggleWeekday = useCallback((weekday: number) => {
    setFilters((prev) => {
      const exists = prev.weekdays.includes(weekday);
      return {
        ...prev,
        weekdays: exists ? prev.weekdays.filter((w) => w !== weekday) : [...prev.weekdays, weekday],
      };
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleOnlyIssues = useCallback(() => {
    setFilters((prev) => ({ ...prev, onlyIssues: !prev.onlyIssues }));
  }, []);

  // Cross-filtering action: click bar/slice/row
  const addCrossFilter = useCallback((kind: 'inspector' | 'agency' | 'type' | 'date' | 'status' | 'size', value: string) => {
    setFilters((prev) => {
      if (kind === 'inspector') {
        if (!prev.inspectors.includes(value)) {
          return { ...prev, inspectors: [...prev.inspectors, value] };
        }
      } else if (kind === 'agency') {
        if (!prev.agencies.includes(value)) {
          return { ...prev, agencies: [...prev.agencies, value] };
        }
      } else if (kind === 'type') {
        if (!prev.types.includes(value)) {
          return { ...prev, types: [...prev.types, value] };
        }
      } else if (kind === 'size') {
        if (!prev.sizes.includes(value)) {
          return { ...prev, sizes: [...prev.sizes, value] };
        }
      } else if (kind === 'status') {
        if (!prev.statuses.includes(value)) {
          return { ...prev, statuses: [...prev.statuses, value] };
        }
      } else if (kind === 'date') {
        return {
          ...prev,
          datePreset: 'custom',
          dateFrom: value,
          dateTo: value,
        };
      }
      return prev;
    });
  }, []);

  const toggleIncludeExcludedStatuses = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      includeExcludedStatuses: !prev.includeExcludedStatuses,
    }));
  }, []);

  const filterOnlyStatus = useCallback((statusName: string) => {
    setFilters((prev) => ({
      ...prev,
      statuses: [statusName],
      includeExcludedStatuses: true,
    }));
  }, []);

  // Compute active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.datePreset !== 'all' || filters.dateFrom || filters.dateTo) count++;
    if (filters.inspectors.length > 0) count += filters.inspectors.length;
    if (filters.agencies.length > 0) count += filters.agencies.length;
    if (filters.managers.length > 0) count += filters.managers.length;
    if (filters.types.length > 0) count += filters.types.length;
    if (filters.sources.length > 0) count += filters.sources.length;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.includeExcludedStatuses) count++;
    if (filters.sizes.length > 0) count += filters.sizes.length;
    if (filters.weekdays.length > 0) count += filters.weekdays.length;
    if (filters.searchQuery.trim()) count++;
    if (filters.onlyIssues) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
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
  };
}
