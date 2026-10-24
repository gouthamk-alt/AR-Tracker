import { InspectionRow, FilterState, KpiMetrics } from '../types';
import { getPreviousPeriodRange, isDateInRange, formatDisplayDate, getPresetDates } from './dateUtils';

export const EXCLUDED_STATUSES = ['cancelled', 'duplicate', 'ignored'];

export function isExcludedStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return EXCLUDED_STATUSES.includes(status.trim().toLowerCase());
}

/**
 * Checks if a single row matches the given filter state, with an optional exclusion of one filter field
 * (used to compute dynamic dropdown counts).
 */
export function rowMatchesFilter(
  row: InspectionRow,
  filters: FilterState,
  excludeField?: keyof FilterState
): boolean {
  // 1. Date range
  if (excludeField !== 'datePreset' && excludeField !== 'dateFrom' && excludeField !== 'dateTo') {
    let effectiveFrom = filters.dateFrom;
    let effectiveTo = filters.dateTo;

    // Auto-resolve preset dates if not explicitly provided in from/to
    if (filters.datePreset !== 'all' && filters.datePreset !== 'custom' && !effectiveFrom && !effectiveTo) {
      const presetDates = getPresetDates(filters.datePreset);
      effectiveFrom = presetDates.from;
      effectiveTo = presetDates.to;
    }

    if (!isDateInRange(row.dateStr, effectiveFrom, effectiveTo)) {
      return false;
    }
  }

  // 2. Inspector
  if (excludeField !== 'inspectors' && filters.inspectors.length > 0) {
    if (!filters.inspectors.includes(row.inspector)) return false;
  }

  // 3. Agency
  if (excludeField !== 'agencies' && filters.agencies.length > 0) {
    if (!filters.agencies.includes(row.agency)) return false;
  }

  // 4. Manager
  if (excludeField !== 'managers' && filters.managers.length > 0) {
    if (!filters.managers.includes(row.manager)) return false;
  }

  // 5. Type
  if (excludeField !== 'types' && filters.types.length > 0) {
    if (!filters.types.includes(row.type)) return false;
  }

  // 6. Source
  if (excludeField !== 'sources' && filters.sources.length > 0) {
    if (!filters.sources.includes(row.source)) return false;
  }

  // 7. Status
  if (excludeField !== 'statuses') {
    if (filters.statuses.length > 0) {
      const match = filters.statuses.some(
        (s) => s.toLowerCase() === row.status.toLowerCase()
      );
      if (!match) return false;
    } else if (!filters.includeExcludedStatuses) {
      // By default, exclude Cancelled, Duplicate, and Ignored rows
      if (isExcludedStatus(row.status)) {
        return false;
      }
    }
  }

  // 8. Size
  if (excludeField !== 'sizes' && filters.sizes.length > 0) {
    if (!filters.sizes.includes(row.size)) return false;
  }

  // 9. Weekdays
  if (excludeField !== 'weekdays' && filters.weekdays.length > 0) {
    if (!filters.weekdays.includes(row.dayOfWeek)) return false;
  }

  // 10. Search query (Address, Job ref, Raw title)
  if (excludeField !== 'searchQuery' && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase();
    const match =
      row.address.toLowerCase().includes(q) ||
      row.jobRef.toLowerCase().includes(q) ||
      row.rawTitle.toLowerCase().includes(q) ||
      row.inspector.toLowerCase().includes(q) ||
      row.agency.toLowerCase().includes(q);
    if (!match) return false;
  }

  // 11. Only issues
  if (excludeField !== 'onlyIssues' && filters.onlyIssues) {
    if (!row.check) return false;
  }

  return true;
}

export function filterRows(rows: InspectionRow[], filters: FilterState): InspectionRow[] {
  return rows.filter((r) => rowMatchesFilter(r, filters));
}

/**
 * Computes live counts for a specific field based on all other active filters.
 */
export function getFieldCounts(
  rows: InspectionRow[],
  filters: FilterState,
  field: 'inspector' | 'agency' | 'manager' | 'type' | 'size' | 'source' | 'status'
): Record<string, number> {
  const filterKeyMap: Record<string, keyof FilterState> = {
    inspector: 'inspectors',
    agency: 'agencies',
    manager: 'managers',
    type: 'types',
    size: 'sizes',
    source: 'sources',
    status: 'statuses',
  };

  const excludeField = filterKeyMap[field];
  const matchedRows = rows.filter((r) => rowMatchesFilter(r, filters, excludeField));

  const counts: Record<string, number> = {};
  matchedRows.forEach((r) => {
    let val = '';
    if (field === 'inspector') val = r.inspector;
    else if (field === 'agency') val = r.agency;
    else if (field === 'manager') val = r.manager;
    else if (field === 'type') val = r.type;
    else if (field === 'size') val = r.size;
    else if (field === 'source') val = r.source;
    else if (field === 'status') {
      const s = r.status.trim().toLowerCase();
      if (s === 'open') val = 'Open';
      else if (s === 'done') val = 'Done';
      else if (s === 'cancelled') val = 'Cancelled';
      else if (s === 'duplicate') val = 'Duplicate';
      else if (s === 'ignored') val = 'Ignored';
      else val = r.status;
    }

    if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  });

  return counts;
}

/**
 * Calculates KPI metrics with previous period comparisons.
 */
export function calculateKpis(
  filteredRows: InspectionRow[],
  allRows: InspectionRow[],
  filters: FilterState
): KpiMetrics {
  const total = filteredRows.length;

  // Working days (unique dates with at least 1 inspection)
  const dateCounts: Record<string, { count: number; date: Date | null }> = {};
  const inspectorCounts: Record<string, number> = {};
  const agencyCounts: Record<string, number> = {};
  let doneCount = 0;
  let openCount = 0;

  filteredRows.forEach((r) => {
    if (r.dateStr) {
      if (!dateCounts[r.dateStr]) {
        dateCounts[r.dateStr] = { count: 0, date: r.date };
      }
      dateCounts[r.dateStr].count++;
    }

    if (r.inspector) {
      inspectorCounts[r.inspector] = (inspectorCounts[r.inspector] || 0) + 1;
    }

    if (r.agency) {
      agencyCounts[r.agency] = (agencyCounts[r.agency] || 0) + 1;
    }

    if (r.status.toLowerCase() === 'done') {
      doneCount++;
    } else {
      openCount++;
    }
  });

  const workingDaysCount = Object.keys(dateCounts).length;
  const avgPerWorkingDay = workingDaysCount > 0 ? +(total / workingDaysCount).toFixed(1) : 0;

  // Busiest day
  let busiestDay: KpiMetrics['busiestDay'] = null;
  let maxDayCount = 0;
  Object.entries(dateCounts).forEach(([dateStr, data]) => {
    if (data.count > maxDayCount) {
      maxDayCount = data.count;
      busiestDay = {
        dateStr,
        formatted: data.date ? formatDisplayDate(data.date) : dateStr,
        count: data.count,
      };
    }
  });

  const activeInspectorsCount = Object.keys(inspectorCounts).length;
  const activeAgenciesCount = Object.keys(agencyCounts).length;

  const donePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Top inspector & agency
  let topInspector: { name: string; count: number } | null = null;
  let topInspCount = 0;
  Object.entries(inspectorCounts).forEach(([name, count]) => {
    if (count > topInspCount) {
      topInspCount = count;
      topInspector = { name, count };
    }
  });

  let topAgency: { name: string; count: number } | null = null;
  let topAgencyCount = 0;
  Object.entries(agencyCounts).forEach(([name, count]) => {
    if (count > topAgencyCount) {
      topAgencyCount = count;
      topAgency = { name, count };
    }
  });

  // Calculate Previous Period
  let prevTotal = 0;
  let prevWorkingDays = 0;
  let prevActiveInspectorsCount = 0;
  let prevActiveAgenciesCount = 0;
  let prevDoneCount = 0;
  let prevDateCounts: Record<string, number> = {};
  let prevInspCounts: Record<string, number> = {};
  let prevAgencyCounts: Record<string, number> = {};
  const prevUniquePropertySet = new Set<string>();

  // Unique properties in current filtered rows (distinct Date + Address combinations)
  const uniquePropertySet = new Set<string>();
  filteredRows.forEach((r) => {
    const addr = (r.address || '').toLowerCase().trim();
    if (addr) {
      uniquePropertySet.add(`${r.dateStr}:::${addr}`);
    }
  });
  const uniqueProperties = uniquePropertySet.size;

  let effectiveFrom = filters.dateFrom;
  let effectiveTo = filters.dateTo;
  if (filters.datePreset !== 'all' && filters.datePreset !== 'custom' && !effectiveFrom && !effectiveTo) {
    const presetDates = getPresetDates(filters.datePreset);
    effectiveFrom = presetDates.from;
    effectiveTo = presetDates.to;
  }

  const prevPeriod = getPreviousPeriodRange(effectiveFrom, effectiveTo);

  if (prevPeriod) {
    const prevFilters: FilterState = {
      ...filters,
      datePreset: 'custom',
      dateFrom: prevPeriod.from,
      dateTo: prevPeriod.to,
    };
    const prevRows = filterRows(allRows, prevFilters);
    prevTotal = prevRows.length;

    prevRows.forEach((r) => {
      if (r.dateStr) {
        prevDateCounts[r.dateStr] = (prevDateCounts[r.dateStr] || 0) + 1;
      }
      if (r.address) {
        const addr = r.address.toLowerCase().trim();
        if (addr) {
          prevUniquePropertySet.add(`${r.dateStr}:::${addr}`);
        }
      }
      if (r.inspector) {
        prevInspCounts[r.inspector] = (prevInspCounts[r.inspector] || 0) + 1;
      }
      if (r.agency) {
        prevAgencyCounts[r.agency] = (prevAgencyCounts[r.agency] || 0) + 1;
      }
      if (r.status.toLowerCase() === 'done') {
        prevDoneCount++;
      }
    });

    prevWorkingDays = Object.keys(prevDateCounts).length;
    prevActiveInspectorsCount = Object.keys(prevInspCounts).length;
    prevActiveAgenciesCount = Object.keys(prevAgencyCounts).length;
  }

  const prevUniqueProperties = prevUniquePropertySet.size;
  const uniquePropertiesChangePct =
    prevPeriod && prevUniqueProperties > 0
      ? Math.round(((uniqueProperties - prevUniqueProperties) / prevUniqueProperties) * 100)
      : null;

  const prevAvgPerWorkingDay = prevWorkingDays > 0 ? +(prevTotal / prevWorkingDays).toFixed(1) : 0;
  const prevDonePct = prevTotal > 0 ? Math.round((prevDoneCount / prevTotal) * 100) : 0;

  // Percentage changes (using ONE definition of previous period everywhere)
  const totalChangePct = prevPeriod && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const avgChangePct =
    prevPeriod && prevAvgPerWorkingDay > 0
      ? Math.round(((avgPerWorkingDay - prevAvgPerWorkingDay) / prevAvgPerWorkingDay) * 100)
      : null;

  const inspectorsChange = activeInspectorsCount - prevActiveInspectorsCount;
  const agenciesChange = activeAgenciesCount - prevActiveAgenciesCount;

  return {
    total,
    prevTotal,
    totalChangePct,
    uniqueProperties,
    prevUniqueProperties,
    uniquePropertiesChangePct,
    avgPerWorkingDay,
    prevAvgPerWorkingDay,
    avgChangePct,
    workingDaysCount,
    busiestDay,
    activeInspectorsCount,
    prevActiveInspectorsCount,
    inspectorsChange,
    activeAgenciesCount,
    prevActiveAgenciesCount,
    agenciesChange,
    doneCount,
    openCount,
    donePct,
    prevDonePct,
    topInspector,
    topAgency,
  };
}
