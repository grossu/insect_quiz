import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { ChecklistSpecies, InatSpeciesCountResult } from '../types/insect';
import {
  CHECKLIST_FAMILY_GROUPS,
  CHECKLIST_REGIONS,
  CHECKLIST_USER_LOGIN,
  FAMILY_NAMES,
} from '../data/checklist';
import { readCache, writeCache, invalidateCache } from '../services/checklistCache';
import {
  fetchRegionalSpecies,
  fetchUserSpeciesInRegion,
  fetchUserResearchSpeciesInRegion,
  fetchRussianNames,
  fetchUserFirstObservations,
  fetchUserObservationsAll,
  ObsPoint,
} from '../services/inaturalist';
import { SpeciesCard } from './SpeciesCard';
import { ChecklistStats } from './ChecklistStats';

const HYMENOPTERA_TAXON_ID = 47201;
const STATS_CACHE_TTL = 24 * 60 * 60 * 1000;

function readStatsCache(regionId: string): ObsPoint[] | null {
  try {
    const raw = localStorage.getItem(`obs_stats_${regionId}`);
    if (!raw) return null;
    const { timestamp, history } = JSON.parse(raw);
    if (Date.now() - timestamp > STATS_CACHE_TTL) {
      localStorage.removeItem(`obs_stats_${regionId}`);
      return null;
    }
    return history;
  } catch { return null; }
}

function writeStatsCache(regionId: string, history: ObsPoint[]) {
  try {
    localStorage.setItem(`obs_stats_${regionId}`, JSON.stringify({ timestamp: Date.now(), history }));
  } catch { /* quota */ }
}

type LoadState = 'idle' | 'loading' | 'enriching' | 'done' | 'error';
type ViewMode = 'cards' | 'list';

interface SectionGroup {
  key: string;
  label: string;
  species: ChecklistSpecies[];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function StatusIcon({ species }: { species: ChecklistSpecies }) {
  if (species.found && species.foundConfirmed) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (species.found) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300" />
  );
}

export function RegionalChecklist() {
  const [selectedGroupId, setSelectedGroupId] = useState(CHECKLIST_FAMILY_GROUPS[0].id);
  const [selectedRegionId, setSelectedRegionId] = useState(CHECKLIST_REGIONS[0].id);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allSpecies, setAllSpecies] = useState<ChecklistSpecies[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [obsHistory, setObsHistory] = useState<ObsPoint[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const region = CHECKLIST_REGIONS.find(r => r.id === selectedRegionId)!;
  const currentGroup = CHECKLIST_FAMILY_GROUPS.find(g => g.id === selectedGroupId)!;

  const foundCount = allSpecies.filter(s => s.found).length;
  const total = allSpecies.length;
  const pct = total > 0 ? Math.round((foundCount / total) * 100) : 0;

  const sections: SectionGroup[] = useMemo(() => {
    if (currentGroup.groupByGenus) {
      const byGenus = new Map<string, ChecklistSpecies[]>();
      for (const s of allSpecies) {
        const genus = s.latinName.split(' ')[0];
        if (!byGenus.has(genus)) byGenus.set(genus, []);
        byGenus.get(genus)!.push(s);
      }
      return [...byGenus.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([genus, spp]) => ({
          key: genus,
          label: genus,
          species: [...spp].sort((a, b) => a.latinName.localeCompare(b.latinName)),
        }));
    }

    const displayIds = currentGroup.subgroupIds ?? currentGroup.taxonIds;
    return displayIds
      .map(id => ({
        key: String(id),
        label: FAMILY_NAMES[id] ?? 'Unknown',
        species: allSpecies
          .filter(s => s.familyTaxonId === id)
          .sort((a, b) => a.latinName.localeCompare(b.latinName)),
      }))
      .filter(g => g.species.length > 0);
  }, [allSpecies, currentGroup]);

  const toggleSection = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const loadStats = useCallback(async () => {
    const reg = CHECKLIST_REGIONS.find(r => r.id === selectedRegionId)!;
    const cached = readStatsCache(selectedRegionId);
    if (cached) { setObsHistory(cached); return; }
    setStatsLoading(true);
    try {
      const history = await fetchUserObservationsAll(
        CHECKLIST_USER_LOGIN, HYMENOPTERA_TAXON_ID, reg.placeIds
      );
      writeStatsCache(selectedRegionId, history);
      setObsHistory(history);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedRegionId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const load = useCallback(
    async (forceRefresh = false) => {
      const group = CHECKLIST_FAMILY_GROUPS.find(g => g.id === selectedGroupId)!;
      const reg = CHECKLIST_REGIONS.find(r => r.id === selectedRegionId)!;
      const cacheIds = group.subgroupIds ?? group.taxonIds;

      setLoadState('loading');
      setErrorMsg(null);
      setAllSpecies([]);
      setCollapsed(new Set());

      try {
        let allRaw: InatSpeciesCountResult[] = [];
        let familyAssignments: Record<number, number> = {};
        let userResults: InatSpeciesCountResult[] | null = null;
        let userResearchResults: InatSpeciesCountResult[] | null = null;
        let firstObservations: Record<number, string> = {};

        if (!forceRefresh) {
          const cached = readCache(cacheIds, reg.placeIds);
          if (cached?.userResearchSpecies) {
            allRaw = cached.allSpecies;
            familyAssignments = cached.familyAssignments ?? {};
            userResults = cached.userSpecies;
            userResearchResults = cached.userResearchSpecies;
            firstObservations = cached.firstObservations ?? {};
          }
        } else {
          invalidateCache(cacheIds, reg.placeIds);
        }

        if (!userResults || !userResearchResults) {
          if (group.subgroupIds?.length) {
            const perSubgroup = await Promise.all(
              group.subgroupIds.map(sgId => fetchRegionalSpecies([sgId], reg.placeIds))
            );
            familyAssignments = {};
            allRaw = [];
            perSubgroup.forEach((results, i) => {
              const sgId = group.subgroupIds![i];
              results.forEach(r => {
                familyAssignments[r.taxon.id] = sgId;
                allRaw.push(r);
              });
            });
          } else {
            allRaw = await fetchRegionalSpecies(group.taxonIds, reg.placeIds);
            familyAssignments = {};
            allRaw.forEach(r => {
              const match = group.taxonIds.find(id =>
                r.taxon.ancestor_ids?.includes(id) || r.taxon.id === id
              );
              if (match !== undefined) familyAssignments[r.taxon.id] = match;
            });
          }

          [userResults, userResearchResults] = await Promise.all([
            fetchUserSpeciesInRegion(CHECKLIST_USER_LOGIN, group.taxonIds, reg.placeIds),
            fetchUserResearchSpeciesInRegion(CHECKLIST_USER_LOGIN, group.taxonIds, reg.placeIds),
          ]);

          firstObservations = Object.fromEntries(
            await fetchUserFirstObservations(CHECKLIST_USER_LOGIN, group.taxonIds, reg.placeIds)
          );

          writeCache(cacheIds, reg.placeIds, {
            allSpecies: allRaw,
            familyAssignments,
            userSpecies: userResults,
            userResearchSpecies: userResearchResults,
            firstObservations,
          });
        }

        const foundIds = new Set(userResults.map(r => r.taxon.id));
        const foundResearchIds = new Set(userResearchResults.map(r => r.taxon.id));

        const initial: ChecklistSpecies[] = allRaw.map(r => ({
          taxonId: r.taxon.id,
          latinName: r.taxon.name,
          photoUrl: r.taxon.default_photo?.url,
          regionalCount: r.count,
          found: foundIds.has(r.taxon.id),
          foundConfirmed: foundResearchIds.has(r.taxon.id),
          familyTaxonId: familyAssignments[r.taxon.id],
          firstObservedOn: firstObservations[r.taxon.id],
        }));

        setAllSpecies(initial);
        setLoadState('enriching');

        const missingIds = initial.filter(s => !s.found).map(s => s.taxonId);
        const russianNames = await fetchRussianNames(missingIds);

        setAllSpecies(prev =>
          prev.map(s =>
            russianNames.has(s.taxonId) ? { ...s, russianName: russianNames.get(s.taxonId) } : s
          )
        );
        setLoadState('done');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Ошибка загрузки');
        setLoadState('error');
      }
    },
    [selectedGroupId, selectedRegionId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">

      {/* Region selector */}
      <div className="flex gap-2 mb-4">
        {CHECKLIST_REGIONS.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRegionId(r.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedRegionId === r.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-700'
            }`}
          >
            {r.labelRu}
          </button>
        ))}
      </div>

      {/* Family group selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CHECKLIST_FAMILY_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => setSelectedGroupId(g.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGroupId === g.id
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400 hover:text-green-700'
            }`}
          >
            {g.labelRu}
          </button>
        ))}
      </div>

      {/* Controls row: view toggle + refresh */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('cards')}
            title="Карточки"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'cards' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Список"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List size={15} />
          </button>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loadState === 'loading' || loadState === 'enriching'}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={13} className={loadState === 'loading' ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      {/* Stats by year/month */}
      <ChecklistStats history={obsHistory} loading={statsLoading} />

      {/* Progress bar */}
      {(loadState === 'enriching' || loadState === 'done') && total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              Найдено: <span className="text-green-600">{foundCount}</span> из {total}
            </span>
            <span className="font-semibold text-green-600">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Подтверждено
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Ожидает ID
            </span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <RefreshCw size={32} className="animate-spin text-green-500" />
          <span className="text-sm">Загрузка видов из iNaturalist…</span>
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
          <AlertCircle size={32} />
          <p className="text-sm">{errorMsg}</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm transition-colors"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Sections */}
      {(loadState === 'enriching' || loadState === 'done') && sections.map(({ key, label, species }) => {
        const isCollapsed = collapsed.has(key);
        const foundInSection = species.filter(s => s.found).length;

        return (
          <section key={key} className="mb-8">
            <button
              onClick={() => toggleSection(key)}
              className="flex items-center gap-2 mb-3 group"
            >
              {isCollapsed
                ? <ChevronRight size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                : <ChevronDown size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
              }
              <span className="text-base font-semibold italic text-gray-800 group-hover:text-green-700 transition-colors">
                {label}
              </span>
              <span className="text-sm text-gray-400 font-normal not-italic">
                {foundInSection}/{species.length}
              </span>
              {loadState === 'enriching' && (
                <span className="text-xs text-gray-300 font-normal not-italic animate-pulse ml-1">
                  загрузка названий…
                </span>
              )}
            </button>

            {!isCollapsed && viewMode === 'cards' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {species.map(s => (
                  <SpeciesCard key={s.taxonId} species={s} placeIds={region.placeIds} found={s.found} />
                ))}
              </div>
            )}

            {!isCollapsed && viewMode === 'list' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {species.map((s, idx) => {
                  const inatUrl = `https://www.inaturalist.org/observations?taxon_id=${s.taxonId}&place_id=${region.placeIds.join(',')}`;
                  const commonName = s.russianName;
                  return (
                    <a
                      key={s.taxonId}
                      href={inatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        idx < species.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <StatusIcon species={s} />
                      <span className="text-sm italic text-gray-800 w-52 flex-shrink-0 truncate">
                        {s.latinName}
                      </span>
                      <span className="text-sm text-gray-400 flex-1 truncate">
                        {commonName ?? '—'}
                      </span>
                      {s.firstObservedOn && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatDate(s.firstObservedOn)}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Empty state */}
      {(loadState === 'enriching' || loadState === 'done') && total === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Наблюдений в этом регионе пока нет
        </div>
      )}
    </div>
  );
}
