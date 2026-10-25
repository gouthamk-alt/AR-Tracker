import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  BarChart3,
  Layers,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { InspectionRow } from '../types';
import { TYPE_COLORS } from '../constants/theme';
import { downloadCsv } from '../utils/csvExport';

interface AgencyBreakdownSectionProps {
  rows: InspectionRow[];
  onSelectAgency: (agency: string) => void;
  isDark?: boolean;
}

interface AgencyReportItem {
  agency: string;
  pcr: number;
  pcrPhotos: number;
  pcrCombined: number;
  inventory: number;
  finalBond: number;
  routine: number;
  commercial: number;
  total: number;
  pctOfTotal: number;
}

export const AgencyBreakdownSection: React.FC<AgencyBreakdownSectionProps> = ({
  rows,
  onSelectAgency,
  isDark,
}) => {
  const [combinePcr, setCombinePcr] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [chartSliceMode, setChartSliceMode] = useState<'top10' | 'bottom10' | 'all'>('top10');

  // Compute agency aggregates
  const { allAgenciesData, totalsRow, maxCountInTable } = useMemo(() => {
    const map: Record<string, {
      pcr: number;
      pcrPhotos: number;
      inventory: number;
      finalBond: number;
      routine: number;
      commercial: number;
      total: number;
    }> = {};

    let grandTotal = 0;
    let maxCount = 0;

    rows.forEach((r) => {
      const agencyName = (r.agency || 'Unknown Agency').trim();
      if (!map[agencyName]) {
        map[agencyName] = {
          pcr: 0,
          pcrPhotos: 0,
          inventory: 0,
          finalBond: 0,
          routine: 0,
          commercial: 0,
          total: 0,
        };
      }

      const t = (r.type || '').trim().toUpperCase();
      if (t === 'PCR') {
        map[agencyName].pcr++;
      } else if (t === 'PCR PHOTOS ONLY') {
        map[agencyName].pcrPhotos++;
      } else if (t === 'INVENTORY') {
        map[agencyName].inventory++;
      } else if (t === 'FINAL BOND') {
        map[agencyName].finalBond++;
      } else if (t === 'ROUTINE' || t.includes('ROUTINE') || r.source === 'Routine') {
        map[agencyName].routine++;
      } else if (t === 'COMMERCIAL' || t.includes('COMMERCIAL')) {
        map[agencyName].commercial++;
      } else {
        // Fallback default
        map[agencyName].pcr++;
      }

      map[agencyName].total++;
      grandTotal++;
    });

    const list: AgencyReportItem[] = Object.entries(map).map(([agency, counts]) => {
      const pcrCombined = counts.pcr + counts.pcrPhotos;
      const pctOfTotal = grandTotal > 0 ? +((counts.total / grandTotal) * 100).toFixed(1) : 0;

      // Track max for heat color scaling
      const itemsToCheck = [counts.pcr, counts.pcrPhotos, counts.inventory, counts.finalBond, counts.routine, counts.commercial];
      itemsToCheck.forEach((val) => {
        if (val > maxCount) maxCount = val;
      });

      return {
        agency,
        pcr: counts.pcr,
        pcrPhotos: counts.pcrPhotos,
        pcrCombined,
        inventory: counts.inventory,
        finalBond: counts.finalBond,
        routine: counts.routine,
        commercial: counts.commercial,
        total: counts.total,
        pctOfTotal,
      };
    });

    // Totals row
    let totPcr = 0;
    let totPcrPhotos = 0;
    let totInventory = 0;
    let totFinalBond = 0;
    let totRoutine = 0;
    let totCommercial = 0;

    list.forEach((item) => {
      totPcr += item.pcr;
      totPcrPhotos += item.pcrPhotos;
      totInventory += item.inventory;
      totFinalBond += item.finalBond;
      totRoutine += item.routine;
      totCommercial += item.commercial;
    });

    const totCombined = totPcr + totPcrPhotos;

    const totals: AgencyReportItem = {
      agency: 'Total',
      pcr: totPcr,
      pcrPhotos: totPcrPhotos,
      pcrCombined: totCombined,
      inventory: totInventory,
      finalBond: totFinalBond,
      routine: totRoutine,
      commercial: totCommercial,
      total: grandTotal,
      pctOfTotal: 100.0,
    };

    return {
      allAgenciesData: list,
      totalsRow: totals,
      maxCountInTable: Math.max(maxCount, 1),
    };
  }, [rows]);

  // Filter by search query
  const filteredAgencies = useMemo(() => {
    let result = allAgenciesData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.agency.toLowerCase().includes(q));
    }

    // Sort
    return [...result].sort((a, b) => {
      let aVal: any = (a as any)[sortColumn];
      let bVal: any = (b as any)[sortColumn];

      if (sortColumn === 'agency') {
        aVal = a.agency.toLowerCase();
        bVal = b.agency.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allAgenciesData, searchQuery, sortColumn, sortDirection]);

  // Chart data
  const chartData = useMemo(() => {
    const sorted = [...allAgenciesData].sort((a, b) => b.total - a.total);
    if (chartSliceMode === 'top10') {
      return sorted.slice(0, 10);
    } else if (chartSliceMode === 'bottom10') {
      return [...sorted].reverse().slice(0, 10);
    }
    return sorted;
  }, [allAgenciesData, chartSliceMode]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('desc');
    }
  };

  const getHeatShade = (count: number) => {
    if (!count) return isDark ? 'text-slate-600 bg-transparent' : 'text-slate-300 bg-transparent';
    const ratio = count / maxCountInTable;
    if (ratio <= 0.15) {
      return isDark ? 'bg-sky-950/60 text-sky-300 font-medium' : 'bg-sky-50 text-sky-800 font-medium';
    }
    if (ratio <= 0.35) {
      return isDark ? 'bg-sky-900/70 text-sky-200 font-semibold' : 'bg-sky-100 text-sky-900 font-semibold';
    }
    if (ratio <= 0.65) {
      return isDark ? 'bg-sky-700/80 text-white font-bold' : 'bg-sky-300 text-sky-950 font-bold';
    }
    return isDark ? 'bg-sky-500 text-slate-950 font-extrabold shadow-2xs' : 'bg-sky-600 text-white font-extrabold shadow-2xs';
  };

  const handleExportCsv = () => {
    const headers = combinePcr
      ? ['Agency', 'PCR (incl. photos only)', 'INVENTORY', 'FINAL BOND', 'ROUTINE', 'COMMERCIAL', 'Total', '% of Total']
      : ['Agency', 'PCR', 'PCR PHOTOS ONLY', 'INVENTORY', 'FINAL BOND', 'ROUTINE', 'COMMERCIAL', 'Total', '% of Total'];

    const exportRows = filteredAgencies.map((item) =>
      combinePcr
        ? [
            item.agency,
            item.pcrCombined,
            item.inventory,
            item.finalBond,
            item.routine,
            item.commercial,
            item.total,
            `${item.pctOfTotal}%`,
          ]
        : [
            item.agency,
            item.pcr,
            item.pcrPhotos,
            item.inventory,
            item.finalBond,
            item.routine,
            item.commercial,
            item.total,
            `${item.pctOfTotal}%`,
          ]
    );

    // Add totals row
    exportRows.push(
      combinePcr
        ? [
            'Total',
            totalsRow.pcrCombined,
            totalsRow.inventory,
            totalsRow.finalBond,
            totalsRow.routine,
            totalsRow.commercial,
            totalsRow.total,
            '100%',
          ]
        : [
            'Total',
            totalsRow.pcr,
            totalsRow.pcrPhotos,
            totalsRow.inventory,
            totalsRow.finalBond,
            totalsRow.routine,
            totalsRow.commercial,
            totalsRow.total,
            '100%',
          ]
    );

    downloadCsv('agency_breakdown_by_report_type', headers, exportRows);
  };

  const renderSortIndicator = (colKey: string) => {
    if (sortColumn !== colKey) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 inline-block ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[3] inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[3] inline-block ml-1" />
    );
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-2xs">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Agency Breakdown by Report Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-tabulation and stacked mix of inspection categories per client agency (click an agency to filter)
            </p>
          </div>
        </div>

        {/* Global actions: Combine toggle & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Combine PCR toggle */}
          <button
            type="button"
            onClick={() => setCombinePcr(!combinePcr)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              combinePcr
                ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
                combinePcr ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-400 dark:border-slate-600'
              }`}
            >
              {combinePcr && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span>Combine PCR + Photos</span>
          </button>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs shadow-sky-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Part 1: Interactive Heatmap Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agency..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredAgencies.length} of {allAgenciesData.length} agencies
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse select-none">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-20 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th
                  onClick={() => handleSort('agency')}
                  className="px-3.5 py-2.5 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800/90 shadow-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Agency {renderSortIndicator('agency')}
                </th>

                {combinePcr ? (
                  <th
                    onClick={() => handleSort('pcrCombined')}
                    className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                  >
                    PCR (incl. photos only) {renderSortIndicator('pcrCombined')}
                  </th>
                ) : (
                  <>
                    <th
                      onClick={() => handleSort('pcr')}
                      className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                    >
                      PCR {renderSortIndicator('pcr')}
                    </th>
                    <th
                      onClick={() => handleSort('pcrPhotos')}
                      className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                    >
                      PCR PHOTOS ONLY {renderSortIndicator('pcrPhotos')}
                    </th>
                  </>
                )}

                <th
                  onClick={() => handleSort('inventory')}
                  className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  INVENTORY {renderSortIndicator('inventory')}
                </th>
                <th
                  onClick={() => handleSort('finalBond')}
                  className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  FINAL BOND {renderSortIndicator('finalBond')}
                </th>
                <th
                  onClick={() => handleSort('routine')}
                  className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  ROUTINE {renderSortIndicator('routine')}
                </th>
                <th
                  onClick={() => handleSort('commercial')}
                  className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  COMMERCIAL {renderSortIndicator('commercial')}
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="px-3 py-2.5 text-center font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Total {renderSortIndicator('total')}
                </th>
                <th
                  onClick={() => handleSort('pctOfTotal')}
                  className="px-3 py-2.5 text-center font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  % of total {renderSortIndicator('pctOfTotal')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredAgencies.length === 0 ? (
                <tr>
                  <td colSpan={combinePcr ? 8 : 9} className="px-4 py-8 text-center text-slate-400">
                    No agencies match "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredAgencies.map((item, idx) => (
                  <tr key={`${item.agency}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td
                      onClick={() => onSelectAgency(item.agency)}
                      className="px-3.5 py-2 font-medium sticky left-0 z-10 bg-white dark:bg-slate-900 cursor-pointer text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 whitespace-nowrap shadow-xs"
                      title={`Filter by ${item.agency}`}
                    >
                      {item.agency}
                    </td>

                    {combinePcr ? (
                      <td className="p-1 text-center">
                        <div className={`py-1 rounded-md ${getHeatShade(item.pcrCombined)}`}>
                          {item.pcrCombined > 0 ? item.pcrCombined : '—'}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="p-1 text-center">
                          <div className={`py-1 rounded-md ${getHeatShade(item.pcr)}`}>
                            {item.pcr > 0 ? item.pcr : '—'}
                          </div>
                        </td>
                        <td className="p-1 text-center">
                          <div className={`py-1 rounded-md ${getHeatShade(item.pcrPhotos)}`}>
                            {item.pcrPhotos > 0 ? item.pcrPhotos : '—'}
                          </div>
                        </td>
                      </>
                    )}

                    <td className="p-1 text-center">
                      <div className={`py-1 rounded-md ${getHeatShade(item.inventory)}`}>
                        {item.inventory > 0 ? item.inventory : '—'}
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      <div className={`py-1 rounded-md ${getHeatShade(item.finalBond)}`}>
                        {item.finalBond > 0 ? item.finalBond : '—'}
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      <div className={`py-1 rounded-md ${getHeatShade(item.routine)}`}>
                        {item.routine > 0 ? item.routine : '—'}
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      <div className={`py-1 rounded-md ${getHeatShade(item.commercial)}`}>
                        {item.commercial > 0 ? item.commercial : '—'}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white">
                      {item.total}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-sky-700 dark:text-sky-300">
                      {item.pctOfTotal}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 sticky bottom-0 z-20 text-slate-900 dark:text-white">
              <tr>
                <td className="px-3.5 py-2.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 shadow-xs">
                  Totals
                </td>
                {combinePcr ? (
                  <td className="px-3 py-2.5 text-center font-mono">{totalsRow.pcrCombined}</td>
                ) : (
                  <>
                    <td className="px-3 py-2.5 text-center font-mono">{totalsRow.pcr}</td>
                    <td className="px-3 py-2.5 text-center font-mono">{totalsRow.pcrPhotos}</td>
                  </>
                )}
                <td className="px-3 py-2.5 text-center font-mono">{totalsRow.inventory}</td>
                <td className="px-3 py-2.5 text-center font-mono">{totalsRow.finalBond}</td>
                <td className="px-3 py-2.5 text-center font-mono">{totalsRow.routine}</td>
                <td className="px-3 py-2.5 text-center font-mono">{totalsRow.commercial}</td>
                <td className="px-3 py-2.5 text-center font-mono text-sky-600 dark:text-sky-400">
                  {totalsRow.total}
                </td>
                <td className="px-3 py-2.5 text-center font-mono">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Part 2: Horizontal Stacked Bar Chart */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Agency Mix Comparison (Horizontal Stacked)
            </h3>
          </div>

          {/* Top 10 / Bottom 10 / All toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
            {(['top10', 'bottom10', 'all'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setChartSliceMode(mode)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition-all ${
                  chartSliceMode === mode
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {mode === 'top10' ? 'Top 10' : mode === 'bottom10' ? 'Bottom 10' : 'All Agencies'}
              </button>
            ))}
          </div>
        </div>

        <div className={chartSliceMode === 'all' ? 'max-h-[460px] overflow-y-auto pr-2' : ''}>
          <ResponsiveContainer
            width="100%"
            height={chartSliceMode === 'all' ? Math.max(380, chartData.length * 40) : 360}
          >
            <BarChart
              layout="vertical"
              data={chartData}
              barCategoryGap="22%"
              barSize={18}
              margin={{ top: 10, right: 30, left: 8, bottom: 10 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const payload = e.activePayload[0].payload;
                  if (payload && payload.agency) {
                    onSelectAgency(payload.agency);
                  }
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={isDark ? '#334155' : '#f1f5f9'}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
              />
              <YAxis
                type="category"
                dataKey="agency"
                interval={0}
                width={185}
                tick={({ x, y, payload }: any) => {
                  const raw = String(payload?.value || '');
                  const truncated = raw.length > 28 ? raw.slice(0, 27) + '…' : raw;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fill={isDark ? '#cbd5e1' : '#334155'}
                      fontSize={11}
                      fontWeight={500}
                    >
                      <title>{raw}</title>
                      {truncated}
                    </text>
                  );
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d: AgencyReportItem = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1.5 z-50 min-w-[200px]">
                      <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 break-words">
                        {d.agency}
                      </p>
                      <div className="space-y-1 text-slate-600 dark:text-slate-300">
                        <p className="flex justify-between gap-4">
                          <span>Total:</span> <span className="font-bold text-slate-900 dark:text-white">{d.total} jobs</span>
                        </p>
                        <p className="flex justify-between gap-4 text-sky-600 dark:text-sky-400 font-medium">
                          <span>% of total:</span> <span className="font-bold">{d.pctOfTotal}%</span>
                        </p>
                      </div>
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-0.5 text-[11px]">
                        {combinePcr ? (
                          <div className="flex justify-between gap-4 text-sky-600 dark:text-sky-400">
                            <span>PCR (incl. photos):</span> <span className="font-semibold">{d.pcrCombined}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between gap-4 text-sky-600 dark:text-sky-400">
                              <span>PCR:</span> <span className="font-semibold">{d.pcr}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-teal-600 dark:text-teal-400">
                              <span>PCR PHOTOS ONLY:</span> <span className="font-semibold">{d.pcrPhotos}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between gap-4 text-indigo-600 dark:text-indigo-400">
                          <span>INVENTORY:</span> <span className="font-semibold">{d.inventory}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                          <span>FINAL BOND:</span> <span className="font-semibold">{d.finalBond}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-purple-600 dark:text-purple-400">
                          <span>ROUTINE:</span> <span className="font-semibold">{d.routine}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-rose-600 dark:text-rose-400">
                          <span>COMMERCIAL:</span> <span className="font-semibold">{d.commercial}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {combinePcr ? (
                <Bar
                  dataKey="pcrCombined"
                  name="PCR (incl. photos only)"
                  stackId="agencyBreakdown"
                  fill={TYPE_COLORS['PCR'].hex}
                  cursor="pointer"
                />
              ) : (
                <>
                  <Bar
                    dataKey="pcr"
                    name="PCR"
                    stackId="agencyBreakdown"
                    fill={TYPE_COLORS['PCR'].hex}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="pcrPhotos"
                    name="PCR PHOTOS ONLY"
                    stackId="agencyBreakdown"
                    fill={TYPE_COLORS['PCR PHOTOS ONLY'].hex}
                    cursor="pointer"
                  />
                </>
              )}

              <Bar
                dataKey="inventory"
                name="INVENTORY"
                stackId="agencyBreakdown"
                fill={TYPE_COLORS['INVENTORY'].hex}
                cursor="pointer"
              />
              <Bar
                dataKey="finalBond"
                name="FINAL BOND"
                stackId="agencyBreakdown"
                fill={TYPE_COLORS['FINAL BOND'].hex}
                cursor="pointer"
              />
              <Bar
                dataKey="routine"
                name="ROUTINE"
                stackId="agencyBreakdown"
                fill={TYPE_COLORS['ROUTINE'].hex}
                cursor="pointer"
              />
              <Bar
                dataKey="commercial"
                name="COMMERCIAL"
                stackId="agencyBreakdown"
                fill={TYPE_COLORS['COMMERCIAL'].hex}
                radius={[0, 4, 4, 0]}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
