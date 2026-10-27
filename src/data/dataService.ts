import Papa from 'papaparse';
import { InspectionRow, DataQualityReport } from '../types';
import { resolveInspectionDate, parseCalendarDate, formatDateKey } from '../utils/dateUtils';
import { generateSampleData, RawInspectionRow } from './sampleData';

// Published Jobs tab (gid=1145016181). If you delete and recreate the tab, update this link.
export const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjrwV2w87nQ8EJRierP-B3jBqCz8-JLt7FbHBgNhHXWwSIenUMK68GaiLWjlodXrjUHCEfalxBmxOt/pub?gid=1145016181&single=true&output=csv';

/**
 * Editable alias map applied after cleaning, so you can merge agency name variants.
 * Keys are lower-case.
 */
export const AGENCY_ALIASES: Record<string, string> = {
  'porter matthews metro': 'Porter Matthews Metro',
  'ray white perth cbd': 'Ray White Perth',
  'lj hooker city': 'LJ Hooker City Residential',
  'belle property': 'Acton | Belle Property',
};

const KNOWN_ACRONYMS = new Set([
  'TWT', 'PM3', 'DGRE', 'BW', 'HKY', 'LJ', 'REIWA', 'CBD', 'PTY', 'LTD',
  'WA', 'ACT', 'NSW', 'VIC', 'QLD', 'SA', 'NT', 'TAS', 'LLC', 'RMD',
]);

/** Does a token in an all-uppercase string look like an acronym (TWT, PM3, DGRE)? */
function isUppercaseAcronym(token: string): boolean {
  const stripped = token.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!stripped) return false;
  if (KNOWN_ACRONYMS.has(stripped)) return true;
  if (/\d/.test(stripped) && /[A-Z]/.test(stripped)) return true;
  if (stripped.length >= 2 && stripped.length <= 4 && !/[AEIOU]/.test(stripped)) return true;
  return false;
}

/**
 * Name cleaning:
 * - mixed-case values are left as they are (only single-letter initials are capitalised)
 * - ALL-UPPERCASE values become Title Case, keeping acronym-looking tokens (TWT, PM3) in capitals
 * - all-lowercase values become Title Case
 */
export function cleanName(str: string | undefined | null): string {
  if (!str) return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);

  if (hasLower && hasUpper) {
    return trimmed.replace(/\b([a-z])\b/g, (match) => match.toUpperCase());
  }

  if (hasLower && !hasUpper) {
    return trimmed
      .split(' ')
      .map((word) => {
        if (!word) return '';
        if (word.length === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  if (hasUpper && !hasLower) {
    return trimmed
      .split(' ')
      .map((word) => {
        if (!word) return '';
        if (word.length === 1) return word.toUpperCase();
        const stripped = word.replace(/[()[\],.]/g, '');
        if (isUppercaseAcronym(stripped)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  return trimmed;
}

export function cleanAgency(rawAgency: string | undefined | null): string {
  const cleaned = cleanName(rawAgency);
  if (!cleaned) return '';
  if (AGENCY_ALIASES[cleaned]) return AGENCY_ALIASES[cleaned];
  const lower = cleaned.toLowerCase();
  for (const [aliasKey, aliasVal] of Object.entries(AGENCY_ALIASES)) {
    if (aliasKey.toLowerCase() === lower) return aliasVal;
  }
  return cleaned;
}

export function cleanInspector(rawInspector: string | undefined | null): string {
  return cleanName(rawInspector);
}

export function cleanManager(rawManager: string | undefined | null): string {
  return cleanName(rawManager);
}

/** Read a CSV field strictly by header name (never by column position). */
function getFieldByHeader(raw: any, headerName: string): string {
  if (!raw || typeof raw !== 'object') return '';
  if (raw[headerName] !== undefined && raw[headerName] !== null) {
    return String(raw[headerName]).trim();
  }
  const targetLower = headerName.toLowerCase();
  for (const key of Object.keys(raw)) {
    if (key.trim().toLowerCase() === targetLower) {
      return String(raw[key] ?? '').trim();
    }
  }
  return '';
}

export type DataSource = 'live-server' | 'live-direct' | 'stale-cache' | 'sample';

export interface FetchResult {
  rows: InspectionRow[];
  qualityReport: DataQualityReport;
  /** True only when the sample data is being shown (kept for existing code). */
  isSampleData: boolean;
  /** Where the data actually came from. Show this in the header. */
  source: DataSource;
  /** When the server last downloaded the sheet (only for live-server / stale-cache). */
  serverFetchedAt?: string;
  /** Newest Date value in the data (YYYY-MM-DD), to see how fresh the sheet is. */
  newestDate: string;
  /** Newest "To-do updated" value in the data. */
  newestTodoUpdated: string;
  error?: string;
  loadedAt: Date;
}

export function processRawRows(rawRows: RawInspectionRow[]): { rows: InspectionRow[]; qualityReport: DataQualityReport } {
  const rows: InspectionRow[] = [];
  const checkWarnings: InspectionRow[] = [];
  const blankAgency: InspectionRow[] = [];
  const blankAddress: InspectionRow[] = [];
  const blankInspector: InspectionRow[] = [];

  const mergedInspectorsMap = new Map<string, string>();
  const mergedAgenciesMap = new Map<string, string>();
  let mergedInspectorsCount = 0;
  let mergedAgenciesCount = 0;

  const canonicalInspectors = new Map<string, string>();
  const canonicalAgencies = new Map<string, string>();
  const canonicalManagers = new Map<string, string>();

  rawRows.forEach((raw, index) => {
    // 1. Read columns strictly by header name
    const rawDate = getFieldByHeader(raw, 'Date');
    const rawInspector = getFieldByHeader(raw, 'Inspector');
    const rawAgency = getFieldByHeader(raw, 'Agency');
    const rawManager = getFieldByHeader(raw, 'Manager');
    const address = getFieldByHeader(raw, 'Address');
    const colFValue = getFieldByHeader(raw, 'Type');
    const rawSize = getFieldByHeader(raw, 'Size');
    const jobRef = getFieldByHeader(raw, 'Job ref');
    const rawStatus = getFieldByHeader(raw, 'Status');
    const rawSource = getFieldByHeader(raw, 'Source');
    const todoId = getFieldByHeader(raw, 'To-do ID');
    const todoUpdated = getFieldByHeader(raw, 'To-do updated');
    const list = getFieldByHeader(raw, 'List');
    const link = getFieldByHeader(raw, 'Link');
    const rawTitle = getFieldByHeader(raw, 'Raw title');
    const check = getFieldByHeader(raw, 'Check');
    const note = getFieldByHeader(raw, 'Note');

    // 2. Size: "0X0" means unknown
    let size = rawSize;
    if (size.toUpperCase().replace(/\s+/g, '') === '0X0') size = '';

    // 3. Type (blank defaults to PCR)
    const upperColF = colFValue.toUpperCase();
    let type = 'PCR';
    if (upperColF.includes('ROUTINE')) {
      type = 'ROUTINE';
    } else if (upperColF.includes('COMMERCIAL') || upperColF === 'COMM') {
      type = 'COMMERCIAL';
    } else if (upperColF.includes('PHOTOS ONLY') || upperColF === 'PCR PHOTOS') {
      type = 'PCR PHOTOS ONLY';
    } else if (upperColF === 'FINAL BOND' || upperColF === 'BOND') {
      type = 'FINAL BOND';
    } else if (upperColF === 'INVENTORY' || upperColF === 'INV') {
      type = 'INVENTORY';
    } else if (upperColF === 'PCR') {
      type = 'PCR';
    } else if (colFValue) {
      type = colFValue;
    }

    // 4. Source
    const source = (type === 'ROUTINE' || rawSource.toLowerCase() === 'routine')
      ? 'Routine'
      : (rawSource || 'Date list');

    // 5. Status: standard capitalised form
    let status = rawStatus || 'Done';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'open') status = 'Open';
    else if (lowerStatus === 'done') status = 'Done';
    else if (lowerStatus === 'cancelled') status = 'Cancelled';
    else if (lowerStatus === 'duplicate') status = 'Duplicate';
    else if (lowerStatus === 'ignored') status = 'Ignored';

    // 6. Name cleaning and case-insensitive merging
    let inspector = cleanInspector(rawInspector);
    if (inspector) {
      const lowerKey = inspector.toLowerCase();
      if (canonicalInspectors.has(lowerKey)) inspector = canonicalInspectors.get(lowerKey)!;
      else canonicalInspectors.set(lowerKey, inspector);
    }
    if (rawInspector && rawInspector !== inspector) {
      mergedInspectorsCount++;
      mergedInspectorsMap.set(rawInspector, inspector);
    }

    let agency = cleanAgency(rawAgency);
    if (agency) {
      const lowerKey = agency.toLowerCase();
      if (canonicalAgencies.has(lowerKey)) agency = canonicalAgencies.get(lowerKey)!;
      else canonicalAgencies.set(lowerKey, agency);
    }
    if (rawAgency && rawAgency !== agency) {
      mergedAgenciesCount++;
      mergedAgenciesMap.set(rawAgency, agency);
    }

    let manager = cleanManager(rawManager);
    if (manager) {
      const lowerKey = manager.toLowerCase();
      if (canonicalManagers.has(lowerKey)) manager = canonicalManagers.get(lowerKey)!;
      else canonicalManagers.set(lowerKey, manager);
    }

    // 7. Parse / resolve the date into a real calendar date across Date, Raw title, List, or To-do updated
    const resolvedDate = resolveInspectionDate(rawDate, rawTitle, list, todoUpdated);
    const parsedDate = resolvedDate.date;
    const dateStr = resolvedDate.dateStr;
    const dayOfWeek = resolvedDate.dayOfWeek;
    const weekdayName = resolvedDate.weekdayName;
    const effectiveRawDate = resolvedDate.displayDate || rawDate;

    const row: InspectionRow = {
      id: todoId ? `${todoId}_${index}` : `row_${index}`,
      date: parsedDate,
      dateStr,
      rawDate: effectiveRawDate,
      dayOfWeek,
      weekdayName,
      inspector,
      rawInspector,
      agency,
      rawAgency,
      manager,
      address,
      type,
      size,
      jobRef,
      status,
      source,
      todoId,
      todoUpdated,
      list,
      link,
      rawTitle,
      check,
      note,
    };

    rows.push(row);

    if (check) checkWarnings.push(row);
    if (!agency) blankAgency.push(row);
    if (!address) blankAddress.push(row);
    if (!inspector) blankInspector.push(row);
  });

  // Duplicates are decided by the sheet script (Status column), not in the dashboard.
  const duplicates: { key: string; dateStr: string; address: string; rows: InspectionRow[] }[] = [];

  const distinctMergedInspectors = Array.from(mergedInspectorsMap.entries()).map(([raw, cleaned]) => ({ raw, cleaned }));
  const distinctMergedAgencies = Array.from(mergedAgenciesMap.entries()).map(([raw, cleaned]) => ({ raw, cleaned }));

  const qualityReport: DataQualityReport = {
    totalRows: rows.length,
    checkWarnings,
    blankAgency,
    blankAddress,
    blankInspector,
    duplicates,
    mergedInspectorsCount,
    mergedAgenciesCount,
    distinctMergedInspectors,
    distinctMergedAgencies,
  };

  return { rows, qualityReport };
}

/** Newest Date and newest "To-do updated" in a set of rows, for the freshness line in the header. */
function freshness(rows: InspectionRow[]): { newestDate: string; newestTodoUpdated: string } {
  let newestDate = '';
  let newestTodoUpdated = '';
  for (const r of rows) {
    if (r.dateStr && r.dateStr > newestDate) newestDate = r.dateStr;
    if (r.todoUpdated && r.todoUpdated > newestTodoUpdated) newestTodoUpdated = r.todoUpdated;
  }
  return { newestDate, newestTodoUpdated };
}

function parseCsv(csvText: string): Promise<RawInspectionRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawInspectionRow>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
      complete: (results) => resolve(results.data || []),
      error: (err: any) => reject(err),
    });
  });
}

/**
 * Parses raw pasted CSV or TSV data (with or without headers) into InspectionRow[] and DataQualityReport.
 * Handles tab-delimited paste from spreadsheets even when the first row lacks a leading tab for blank Date.
 */
export function parsePastedOrCustomData(text: string): { rows: InspectionRow[]; qualityReport: DataQualityReport } {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], qualityReport: processRawRows([]).qualityReport };

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], qualityReport: processRawRows([]).qualityReport };

  const firstLine = lines[0];
  const hasHeader = /date/i.test(firstLine) && /inspector/i.test(firstLine);

  let formattedText = trimmed;
  if (!hasHeader) {
    const isTab = firstLine.includes('\t');
    const delim = isTab ? '\t' : ',';
    const headerRow = [
      'Date', 'Inspector', 'Agency', 'Manager', 'Address', 'Type', 'Size',
      'Job ref', 'Status', 'Source', 'To-do ID', 'To-do updated', 'List',
      'Link', 'Raw title', 'Check', 'Note'
    ].join(delim);

    const fixedLines = lines.map((line) => {
      const parts = line.split(delim);
      if (parts.length >= 14 && parts[0] !== '' && !/^\d{4}/.test(parts[0]) && !/^\d{1,2}[-/\s]/.test(parts[0])) {
        return delim + line;
      }
      return line;
    });
    formattedText = headerRow + '\n' + fixedLines.join('\n');
  }

  const parsed = Papa.parse<RawInspectionRow>(formattedText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  });

  return processRawRows(parsed.data || []);
}

function sampleResult(error: string | undefined, loadedAt: Date): FetchResult {
  const { rows, qualityReport } = processRawRows(generateSampleData());
  return {
    rows,
    qualityReport,
    isSampleData: true,
    source: 'sample',
    ...freshness(rows),
    error,
    loadedAt,
  };
}

/**
 * Main fetch function. Order of attempts:
 *   1. our server endpoint (/api/sheet-csv), which downloads the live sheet on every call
 *   2. the published Google link directly from the browser (no custom headers, so no CORS preflight)
 *   3. the server's last good copy, if Google could not be reached (reported as 'stale-cache')
 *   4. sample data, only if everything above failed (reported as 'sample')
 */
export async function fetchInspectionData(forceSample = false): Promise<FetchResult> {
  const now = new Date();

  if (forceSample) return sampleResult(undefined, now);

  const cb = Date.now();
  let csvText = '';
  let source: DataSource = 'live-server';
  let serverFetchedAt: string | undefined;
  let staleText = '';
  let staleFetchedAt: string | undefined;
  let lastError = '';

  const isBrowser = typeof window !== 'undefined';
  const attempts = isBrowser
    ? [
        { url: `/api/sheet-csv?cb=${cb}`, direct: false },
        { url: `${CSV_URL}&cb=${cb}`, direct: true },
      ]
    : [
        { url: `${CSV_URL}&cb=${cb}`, direct: true },
      ];

  for (const { url, direct } of attempts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      // Direct call: NO custom headers and NO cache option, otherwise Google blocks it (CORS preflight)
      const response = await fetch(url, direct ? { signal: controller.signal } : { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        lastError = `${direct ? 'Google' : 'Server'} responded with HTTP ${response.status}`;
        continue;
      }
      const text = await response.text();
      if (!text.includes('Date,Inspector')) {
        lastError = `${direct ? 'Google' : 'Server'} did not return the Jobs CSV`;
        continue;
      }

      if (direct) {
        csvText = text;
        source = 'live-direct';
        break;
      }
      if (response.headers.get('X-Data-Stale') === 'true') {
        // The server could not reach Google and sent its old copy: remember it, but try the direct link first
        staleText = text;
        staleFetchedAt = response.headers.get('X-Fetched-At') || undefined;
        lastError = 'Server could not reach Google (using its last copy)';
        continue;
      }
      csvText = text;
      source = 'live-server';
      serverFetchedAt = response.headers.get('X-Fetched-At') || undefined;
      break;
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? 'Request timed out' : (err?.message || String(err));
    }
  }

  if (!csvText && staleText) {
    csvText = staleText;
    source = 'stale-cache';
    serverFetchedAt = staleFetchedAt;
  }

  if (!csvText) {
    console.warn('[dataService] All live CSV sources failed, falling back to sample data:', lastError);
    return sampleResult(lastError || 'Could not fetch the live CSV feed. Showing sample data.', now);
  }

  try {
    const parsed = await parseCsv(csvText);
    if (parsed.length === 0) {
      return sampleResult('Live sheet returned no rows. Showing sample data.', now);
    }
    const { rows, qualityReport } = processRawRows(parsed);
    return {
      rows,
      qualityReport,
      isSampleData: false,
      source,
      serverFetchedAt,
      ...freshness(rows),
      error: source === 'stale-cache' ? 'Google could not be reached. Showing the last copy the server downloaded.' : undefined,
      loadedAt: now,
    };
  } catch (parseError: any) {
    console.warn('[dataService] CSV parse error, falling back to sample data:', parseError);
    return sampleResult(parseError?.message || 'Could not read the CSV. Showing sample data.', now);
  }
}