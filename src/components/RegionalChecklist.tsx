import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { ChecklistSpecies } from '../types/insect';
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
} from '../services/inaturalist';
import { SpeciesCard } from './SpeciesCard';

type LoadState = 'idle' | 'loading' | 'enriching' | 'done' | 'error';

export function RegionalChecklist() {
  const [selectedGroupId, setSelectedGroupId] = useState(CHECKLIST_FAMILY_GROUPS[0].id);
  const [selectedRegionId] = useState(CHECKLIST_REGIONS[0].id);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allSpecies, setAllSpecies] = useState<ChecklistSpecies[]>([]);
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<number>>(new Set());

  const region = CHECKLIST_REGIONS.find(r => r.id === selectedRegionId)!;

  const foundCount = allSpecies.filter(s => s.found).length;
  const total = allSpecies.length;
  const pct = total > 0 ? Math.round((foundCount / total) * 100) : 0;

  const currentGroup = CHECKLIST_FAMILY_GROUPS.find(g => g.id === selectedGroupId)!;
  const familyGroups = currentGroup.taxonIds
    .map(familyTaxonId => ({
      familyTaxonId,
      familyName: FAMILY_NAMES[familyTaxonId] ?? 'Unknown',
      species: allSpecies
        .filter(s => s.familyTaxonId === familyTaxonId)
        .sort((a, b) => a.latinName.localeCompare(b.latinName)),
    }))
    .filter(g => g.species.length > 0);

  const toggleFamily = (id: number) =>
    setCollapsedFamilies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const load = useCallback(
    async (forceRefresh = false) => {
      const group = CHECKLIST_FAMILY_GROUPS.find(g => g.id === selectedGroupId)!;
      const reg = CHECKLIST_REGIONS.find(r => r.id === selectedRegionId)!;

      setLoadState('loading');
      setErrorMsg(null);
      setAllSpecies([]);
      setCollapsedFamilies(new Set());

      try {
        let allResults = null;
        let userResults = null;
        let userResearchResults = null;

        if (!forceRefresh) {
          const cached = readCache(group.taxonIds, reg.placeIds);
          if (cached && cached.userResearchSpecies) {
            allResults = cached.allSpecies;
            userResults = cached.userSpecies;
            userResearchResults = cached.userResearchSpecies;
          }
        } else {
          invalidateCache(group.taxonIds, reg.placeIds);
        }

        if (!allResults || !userResults || !userResearchResults) {
          [allResults, userResults, userResearchResults] = await Promise.all([
            fetchRegionalSpecies(group.taxonIds, reg.placeIds),
            fetchUserSpeciesInRegion(CHECKLIST_USER_LOGIN, group.taxonIds, reg.placeIds),
            fetchUserResearchSpeciesInRegion(CHECKLIST_USER_LOGIN, group.taxonIds, reg.placeIds),
          ]);
          writeCache(group.taxonIds, reg.placeIds, {
            allSpecies: allResults,
            userSpecies: userResults,
            userResearchSpecies: userResearchResults,
          });
        }

        const foundIds = new Set(userResults.map(r => r.taxon.id));
        const foundResearchIds = new Set(userResearchResults.map(r => r.taxon.id));

        const initial: ChecklistSpecies[] = allResults.map(r => {
          const familyTaxonId = group.taxonIds.find(id =>
            r.taxon.ancestor_ids?.includes(id) || r.taxon.id === id
          );
          return {
            taxonId: r.taxon.id,
            latinName: r.taxon.name,
            photoUrl: r.taxon.default_photo?.url,
            regionalCount: r.count,
            found: foundIds.has(r.taxon.id),
            foundConfirmed: foundResearchIds.has(r.taxon.id),
            familyTaxonId,
          };
        });

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

      {/* Region label + refresh */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{region.labelRu}</span>
        <button
          onClick={() => load(true)}
          disabled={loadState === 'loading' || loadState === 'enriching'}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={13} className={loadState === 'loading' ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

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
          {/* Legend */}
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

      {/* Family groups */}
      {(loadState === 'enriching' || loadState === 'done') && familyGroups.map(({ familyTaxonId, familyName, species }) => {
        const isCollapsed = collapsedFamilies.has(familyTaxonId);
        const foundInFamily = species.filter(s => s.found).length;

        return (
          <section key={familyTaxonId} className="mb-8">
            <button
              onClick={() => toggleFamily(familyTaxonId)}
              className="flex items-center gap-2 mb-3 group"
            >
              {isCollapsed
                ? <ChevronRight size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                : <ChevronDown size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
              }
              <span className="text-base font-semibold italic text-gray-800 group-hover:text-green-700 transition-colors">
                {familyName}
              </span>
              <span className="text-sm text-gray-400 font-normal not-italic">
                {foundInFamily}/{species.length}
              </span>
              {loadState === 'enriching' && (
                <span className="text-xs text-gray-300 font-normal not-italic animate-pulse ml-1">
                  загрузка названий…
                </span>
              )}
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {species.map(s => (
                  <SpeciesCard key={s.taxonId} species={s} placeIds={region.placeIds} found={s.found} />
                ))}
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
