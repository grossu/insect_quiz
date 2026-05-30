import { useState, useMemo } from 'react';
import { ObsPoint } from '../services/inaturalist';

interface Props {
  history: ObsPoint[];
  loading: boolean;
}

type Period = string;

function getPeriodBounds(period: Period): { from: string; to: string } | null {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (/^\d{4}$/.test(period)) {
    return { from: `${period}-01-01`, to: `${period}-12-31` };
  }
  if (period === '30d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: fmt(today) };
  }
  if (period === 'cur') {
    const y = today.getFullYear(), m = today.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    };
  }
  if (period === 'prev') {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    };
  }
  return null;
}

function filterHistory(history: ObsPoint[], period: Period): ObsPoint[] {
  const bounds = getPeriodBounds(period);
  if (!bounds) return history;
  return history.filter(o => o.observed_on >= bounds.from && o.observed_on <= bounds.to);
}

function computeStats(history: ObsPoint[], filtered: ObsPoint[]) {
  const globalFirst = new Map<number, string>();
  for (const o of history) {
    const ex = globalFirst.get(o.taxonId);
    if (!ex || o.observed_on < ex) globalFirst.set(o.taxonId, o.observed_on);
  }
  const bounds = filtered.length > 0
    ? { from: filtered[0].observed_on, to: filtered[filtered.length - 1].observed_on }
    : null;

  const observations = filtered.length;
  const species = new Set(filtered.map(o => o.taxonId)).size;
  const activeDays = new Set(filtered.map(o => o.observed_on)).size;

  let firstEncounters = 0;
  if (bounds) {
    for (const [, date] of globalFirst) {
      if (date >= bounds.from && date <= bounds.to) firstEncounters++;
    }
  }

  return { observations, species, firstEncounters, activeDays };
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800">
        {loading ? <span className="text-gray-300 animate-pulse">—</span> : value}
      </div>
    </div>
  );
}

export function ChecklistStats({ history, loading }: Props) {
  const years = useMemo(() => {
    const ys = new Set(history.map(o => o.observed_on.slice(0, 4)));
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [history]);

  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => filterHistory(history, period), [history, period]);
  const stats = useMemo(() => computeStats(history, filtered), [history, filtered]);

  const today = new Date();
  const curMonthLabel = today.toLocaleString('ru', { month: 'long' });
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthLabel = prevMonth.toLocaleString('ru', { month: 'long' });

  const periodButtons: Array<{ id: Period; label: string }> = [
    { id: 'all', label: 'Всё время' },
    ...years.map(y => ({ id: y, label: y })),
    { id: '30d', label: '30 дн.' },
    { id: 'cur', label: curMonthLabel },
    { id: 'prev', label: prevMonthLabel },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {loading && years.length === 0
          ? <span className="text-xs text-gray-400 animate-pulse">загрузка…</span>
          : periodButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === btn.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))
        }
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Наблюдения" value={stats.observations} loading={loading} />
        <StatCard label="Виды" value={stats.species} loading={loading} />
        <StatCard label="Первые встречи" value={stats.firstEncounters} loading={loading} />
        <StatCard label="Активных дней" value={stats.activeDays} loading={loading} />
      </div>
    </div>
  );
}
