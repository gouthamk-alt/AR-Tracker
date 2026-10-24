import React from 'react';
import { 
  ClipboardList, 
  Home,
  CalendarDays, 
  Flame, 
  Users, 
  Building, 
  CheckCircle, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  Minus,
  HelpCircle
} from 'lucide-react';
import { KpiMetrics } from '../types';

interface KpiCardsProps {
  metrics: KpiMetrics;
  onFilterByInspector?: (name: string) => void;
  onFilterByAgency?: (name: string) => void;
  onFilterByDate?: (dateStr: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  metrics,
  onFilterByInspector,
  onFilterByAgency,
  onFilterByDate,
}) => {
  const renderChangeBadge = (pct: number | null, customLabel?: string) => {
    if (pct === null) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400">
          <Minus className="w-3 h-3" />
          <span>vs prev period</span>
        </span>
      );
    }

    if (pct > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
          <span>+{pct}% {customLabel || 'vs prev'}</span>
        </span>
      );
    } else if (pct < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
          <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
          <span>{pct}% {customLabel || 'vs prev'}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
        <Minus className="w-3 h-3" />
        <span>0% vs prev</span>
      </span>
    );
  };

  const renderDelta = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          +{delta} vs prev
        </span>
      );
    } else if (delta < 0) {
      return (
        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          {delta} vs prev
        </span>
      );
    }
    return <span className="text-[11px] text-slate-400">0 vs prev</span>;
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Jobs (reports) - previously Total Inspections */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-sky-300 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Jobs (reports)
              </span>
              <span
                className="inline-flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
                title="a PCR and an INVENTORY at the same address count as 2 jobs but 1 property"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {metrics.total.toLocaleString()}
            </span>
            {renderChangeBadge(metrics.totalChangePct)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Previous: {metrics.prevTotal}</span>
            <span className="text-slate-400">•</span>
            <span>{metrics.workingDaysCount} active days</span>
          </div>
        </div>

        {/* 2. Unique Properties */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-800 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unique properties
              </span>
              <span
                className="inline-flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
                title="Number of distinct Date + Address combinations. A PCR and an INVENTORY at the same address count as 2 jobs but 1 property."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {metrics.uniqueProperties.toLocaleString()}
            </span>
            {renderChangeBadge(metrics.uniquePropertiesChangePct)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Previous: {metrics.prevUniqueProperties}</span>
            <span className="text-slate-400">•</span>
            <span>Distinct address / date</span>
          </div>
        </div>

        {/* 3. Avg Per Working Day */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg / Working Day
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {metrics.avgPerWorkingDay}
            </span>
            {renderChangeBadge(metrics.avgChangePct)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Across {metrics.workingDaysCount} working days with inspections
          </div>
        </div>

        {/* 4. Busiest Day */}
        <div 
          onClick={() => metrics.busiestDay && onFilterByDate?.(metrics.busiestDay.dateStr)}
          className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-800 transition-all ${
            metrics.busiestDay ? 'cursor-pointer' : ''
          }`}
          title={metrics.busiestDay ? `Click to filter by ${metrics.busiestDay.formatted}` : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Busiest Day
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {metrics.busiestDay ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {metrics.busiestDay.count}
                  </span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    inspections
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {metrics.busiestDay.formatted}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 py-2">No dates in range</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Metrics & Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 5. Top Inspector */}
        <div 
          onClick={() => metrics.topInspector && onFilterByInspector?.(metrics.topInspector.name)}
          className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-800 transition-all ${
            metrics.topInspector ? 'cursor-pointer' : ''
          }`}
          title={metrics.topInspector ? `Click to filter by ${metrics.topInspector.name}` : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Inspector
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {metrics.topInspector ? (
              <>
                <div className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {metrics.topInspector.name}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  {/* Changed "completed" to "inspections" per Rule 7 */}
                  <span>{metrics.topInspector.count} inspections</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
                    {metrics.total > 0 ? Math.round((metrics.topInspector.count / metrics.total) * 100) : 0}% share
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 py-2">No inspector</div>
            )}
          </div>
        </div>

        {/* 6. Top Agency */}
        <div 
          onClick={() => metrics.topAgency && onFilterByAgency?.(metrics.topAgency.name)}
          className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-800 transition-all ${
            metrics.topAgency ? 'cursor-pointer' : ''
          }`}
          title={metrics.topAgency ? `Click to filter by ${metrics.topAgency.name}` : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Leading Agency
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {metrics.topAgency ? (
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {metrics.topAgency.name}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{metrics.topAgency.count} inspections</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                    {metrics.total > 0 ? Math.round((metrics.topAgency.count / metrics.total) * 100) : 0}% share
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 py-2">No agency</div>
            )}
          </div>
        </div>

        {/* 7. Team & Clients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Team & Clients
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.activeInspectorsCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Inspectors ({renderDelta(metrics.inspectorsChange)})
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.activeAgenciesCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Agencies ({renderDelta(metrics.agenciesChange)})
              </div>
            </div>
          </div>
        </div>

        {/* 8. Ticked off in Basecamp - Secondary Card (Rule 6) */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-2xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ticked off in Basecamp
              </span>
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.donePct}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics.doneCount} Done / {metrics.openCount} Open
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${metrics.donePct}%` }}
                title={`Done: ${metrics.donePct}%`}
              />
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${100 - metrics.donePct}%` }}
                title={`Open: ${100 - metrics.donePct}%`}
              />
            </div>
          </div>
          {/* Note requested by user */}
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
            * Routine jobs are often not ticked, so this is not a completion measure
          </p>
        </div>
      </div>
    </div>
  );
};
