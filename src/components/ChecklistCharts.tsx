import { useState, useMemo } from 'react';
import { ObsPoint } from '../services/inaturalist';
import { ChecklistSpecies } from '../types/insect';
import { FAMILY_NAMES } from '../data/checklist';
import { filterByPeriod, Period } from './ChecklistStats';

type ChartTab = 'calendar' | 'monthly' | 'families';

interface Props {
  obsHistory: ObsPoint[];
  allSpecies: ChecklistSpecies[];
  loading: boolean;
  period: Period;
}

// ── Calendar Heatmap ──────────────────────────────────────────────────────────

function CalendarHeatmap({ history }: { history: ObsPoint[] }) {
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of history) {
      map.set(o.observed_on, (map.get(o.observed_on) ?? 0) + 1);
    }
    return map;
  }, [history]);

  const CELL = 11;
  const LABEL_H = 18;
  const DAY_W = 18;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start 52 weeks ago, aligned to Monday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 51 * 7);
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow));

  type Cell = { date: string; count: number };
  const weeks: Cell[][] = [];
  const cur = new Date(startDate);

  while (cur <= today) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      week.push({ date: iso, count: countByDate.get(iso) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...countByDate.values());

  const color = (n: number) => {
    if (n === 0) return '#e9ecef';
    const t = n / maxCount;
    if (t < 0.2) return '#bbf7d0';
    if (t < 0.4) return '#86efac';
    if (t < 0.65) return '#4ade80';
    if (t < 0.85) return '#22c55e';
    return '#16a34a';
  };

  // Month labels: show when month changes between weeks
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = '';
  weeks.forEach((week, wi) => {
    const m = week[0].date.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      const d = new Date(week[0].date);
      monthLabels.push({
        x: wi * CELL + DAY_W,
        label: d.toLocaleString('ru', { month: 'short' }),
      });
    }
  });

  const svgW = weeks.length * CELL + DAY_W;
  const svgH = 7 * CELL + LABEL_H;

  return (
    <div className="overflow-x-auto pb-1">
      <svg width={svgW} height={svgH}>
        {/* Day labels */}
        {['Пн', '', 'Ср', '', 'Пт', '', 'Вс'].map((label, di) =>
          label ? (
            <text key={di} x={0} y={LABEL_H + di * CELL + 8} fontSize={8} fill="#9ca3af">
              {label}
            </text>
          ) : null
        )}
        {/* Month labels */}
        {monthLabels.map(({ x, label }, i) => (
          <text key={i} x={x} y={11} fontSize={9} fill="#6b7280">{label}</text>
        ))}
        {/* Cells */}
        {weeks.map((week, wi) =>
          week.map((day, di) => (
            <rect
              key={`${wi}-${di}`}
              x={wi * CELL + DAY_W}
              y={di * CELL + LABEL_H}
              width={10}
              height={10}
              rx={2}
              fill={color(day.count)}
            >
              <title>{day.date}: {day.count} набл.</title>
            </rect>
          ))
        )}
      </svg>
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
        <span>меньше</span>
        {['#e9ecef', '#bbf7d0', '#86efac', '#22c55e', '#16a34a'].map(c => (
          <span key={c} className="w-3 h-3 rounded-sm inline-block" style={{ background: c }} />
        ))}
        <span>больше</span>
      </div>
    </div>
  );
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────

function MonthlyChart({ history, period }: { history: ObsPoint[]; period: Period }) {
  const data = useMemo(() => {
    const filtered = filterByPeriod(history, period);
    const byMonth = new Map<string, { obs: number; species: Set<number> }>();
    for (const o of filtered) {
      const key = o.observed_on.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, { obs: 0, species: new Set() });
      const m = byMonth.get(key)!;
      m.obs++;
      m.species.add(o.taxonId);
    }
    const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    const multiYear = new Set(sorted.map(([k]) => k.slice(0, 4))).size > 1;
    return sorted.map(([key, { obs, species }]) => ({
      key,
      obs,
      species: species.size,
      label: new Date(key + '-15').toLocaleString('ru', {
        month: 'short',
        ...(multiYear ? { year: '2-digit' } : {}),
      }),
    }));
  }, [history, period]);

  if (data.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">Нет данных за этот период</p>
  );

  const maxObs = Math.max(1, ...data.map(d => d.obs));
  const H = 90;
  const BAR_W = Math.max(18, Math.min(36, Math.floor(320 / data.length)));
  const GAP = Math.max(3, Math.floor(BAR_W / 3));
  const W = data.length * (BAR_W + GAP);

  return (
    <div className="overflow-x-auto pb-1">
      <svg width={W} height={H + 28}>
        {data.map((d, i) => {
          const x = i * (BAR_W + GAP);
          const obsH = Math.max(2, Math.round((d.obs / maxObs) * H));
          const sH = Math.max(d.species > 0 ? 2 : 0, Math.round((d.species / maxObs) * H));
          return (
            <g key={d.key}>
              {/* observations bar (background) */}
              <rect x={x} y={H - obsH} width={BAR_W} height={obsH} fill="#bbf7d0" rx={2}>
                <title>{d.key}: {d.obs} набл.</title>
              </rect>
              {/* species bar (foreground, narrower) */}
              <rect
                x={x + Math.floor(BAR_W * 0.2)}
                y={H - sH}
                width={Math.floor(BAR_W * 0.6)}
                height={sH}
                fill="#16a34a"
                rx={2}
              >
                <title>{d.key}: {d.species} видов</title>
              </rect>
              {/* obs count label */}
              {d.obs > 0 && (
                <text x={x + BAR_W / 2} y={H - obsH - 3} textAnchor="middle" fontSize={8} fill="#6b7280">
                  {d.obs}
                </text>
              )}
              {/* month label */}
              <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-green-200" />
          наблюдения
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-green-700" />
          виды
        </span>
      </div>
    </div>
  );
}

// ── Family stacked bars ───────────────────────────────────────────────────────

function FamilyBars({ allSpecies }: { allSpecies: ChecklistSpecies[] }) {
  const data = useMemo(() => {
    const byFamily = new Map<number, { found: number; total: number }>();
    for (const s of allSpecies) {
      if (s.familyTaxonId === undefined) continue;
      if (!byFamily.has(s.familyTaxonId)) byFamily.set(s.familyTaxonId, { found: 0, total: 0 });
      const f = byFamily.get(s.familyTaxonId)!;
      f.total++;
      if (s.found) f.found++;
    }
    return [...byFamily.entries()]
      .map(([id, { found, total }]) => ({
        id,
        name: FAMILY_NAMES[id] ?? String(id),
        found,
        total,
        pct: total > 0 ? Math.round((found / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [allSpecies]);

  if (data.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">Нет данных</p>
  );

  const maxTotal = Math.max(1, ...data.map(d => d.total));

  return (
    <div className="space-y-3">
      {data.map(({ id, name, found, total, pct }) => (
        <div key={id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs italic text-gray-600 truncate">{name}</span>
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {found}/{total} · {pct}%
            </span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            {/* total relative to max (context bar) */}
            <div
              className="absolute inset-y-0 left-0 bg-gray-200 rounded-full"
              style={{ width: `${(total / maxTotal) * 100}%` }}
            />
            {/* found */}
            <div
              className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(found / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS: Array<{ id: ChartTab; label: string }> = [
  { id: 'calendar', label: 'Календарь' },
  { id: 'monthly', label: 'По месяцам' },
  { id: 'families', label: 'По семействам' },
];

export function ChecklistCharts({ obsHistory, allSpecies, loading, period }: Props) {
  const [tab, setTab] = useState<ChartTab>('calendar');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-0.5 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && obsHistory.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-gray-300 text-sm animate-pulse">
          загрузка данных…
        </div>
      ) : (
        <>
          {tab === 'calendar' && <CalendarHeatmap history={obsHistory} />}
          {tab === 'monthly' && <MonthlyChart history={obsHistory} period={period} />}
          {tab === 'families' && <FamilyBars allSpecies={allSpecies} />}
        </>
      )}
    </div>
  );
}
