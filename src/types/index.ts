export type InspectionType = 'PCR' | 'PCR PHOTOS ONLY' | 'INVENTORY' | 'FINAL BOND' | 'ROUTINE' | 'COMMERCIAL' | string;
export type InspectionStatus = 'Open' | 'Done' | 'Cancelled' | 'Duplicate' | 'Ignored' | string;
export type InspectionSource = 'Date list' | 'Routine' | string;

export interface InspectionRow {
  id: string;
  date: Date | null;
  dateStr: string; // YYYY-MM-DD
  rawDate: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  weekdayName: string; // Mon, Tue, etc.
  inspector: string;
  rawInspector: string;
  agency: string;
  rawAgency: string;
  manager: string;
  address: string;
  type: InspectionType;
  size: string;
  jobRef: string;
  status: InspectionStatus;
  source: InspectionSource;
  todoId: string;
  todoUpdated: string;
  list: string;
  link: string;
  rawTitle: string;
  check: string;
  note: string;
}

export type DatePreset = 
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_7_days'
  | 'last_14_days'
  | 'this_month'
  | 'last_month'
  | 'next_7_days'
  | 'upcoming'
  | 'custom';

export interface FilterState {
  datePreset: DatePreset;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  inspectors: string[];
  agencies: string[];
  managers: string[];
  types: string[];
  sources: string[]; // 'Date list', 'Routine'
  statuses: string[]; // 'Open', 'Done', 'Cancelled', 'Duplicate', 'Ignored'
  includeExcludedStatuses: boolean; // default false (exclude Cancelled, Duplicate, Ignored)
  sizes: string[];
  weekdays: number[]; // 1 to 7 (Mon=1 ... Sun=7) or 0 to 6
  searchQuery: string;
  onlyIssues: boolean;
}

export interface DataQualityReport {
  totalRows: number;
  checkWarnings: InspectionRow[];
  blankAgency: InspectionRow[];
  blankAddress: InspectionRow[];
  blankInspector: InspectionRow[];
  duplicates: {
    key: string;
    dateStr: string;
    address: string;
    rows: InspectionRow[];
  }[];
  mergedInspectorsCount: number;
  mergedAgenciesCount: number;
  distinctMergedInspectors: { raw: string; cleaned: string }[];
  distinctMergedAgencies: { raw: string; cleaned: string }[];
}

export interface KpiMetrics {
  total: number;
  prevTotal: number;
  totalChangePct: number | null;

  uniqueProperties: number;
  prevUniqueProperties: number;
  uniquePropertiesChangePct: number | null;

  avgPerWorkingDay: number;
  prevAvgPerWorkingDay: number;
  avgChangePct: number | null;

  workingDaysCount: number;

  busiestDay: {
    dateStr: string;
    formatted: string;
    count: number;
  } | null;

  activeInspectorsCount: number;
  prevActiveInspectorsCount: number;
  inspectorsChange: number;

  activeAgenciesCount: number;
  prevActiveAgenciesCount: number;
  agenciesChange: number;

  doneCount: number;
  openCount: number;
  donePct: number;
  prevDonePct: number;

  topInspector: { name: string; count: number } | null;
  topAgency: { name: string; count: number } | null;
}
