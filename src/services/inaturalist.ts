import { InsectObservation, QuizQuestion, AnswerOption, InatSpeciesCountResult } from '../types/insect';

const INATURALIST_API = 'https://api.inaturalist.org/v1';

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    signal?.throwIfAborted();
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries - 1) await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      else throw err;
    }
  }
  throw new Error('Не удалось загрузить данные после нескольких попыток');
}

function baseObservationParams(countryId: number, taxonIds: string[]): Record<string, string> {
  return {
    taxon_id: taxonIds.length > 0 ? taxonIds.join(',') : '47201',
    place_id: countryId.toString(),
    quality_grade: 'research',
    photos: 'true',
    identifications: 'most_agree',
    order: 'desc',
    order_by: 'created_at',
    without_taxon_id: '1269340',
    popular: 'true',
  };
}

export async function fetchRandomInsect(
  countryId: number = 7161,
  taxonIds: string[] = []
): Promise<InsectObservation> {
  const base = baseObservationParams(countryId, taxonIds);

  const initialResponse = await fetch(
    `${INATURALIST_API}/observations?` + new URLSearchParams({ ...base, per_page: '1', page: '1' })
  );

  if (!initialResponse.ok) {
    throw new Error('Failed to fetch insect data');
  }

  const { total_results: totalResults } = await initialResponse.json();

  if (!totalResults) {
    throw new Error('No insects found');
  }

  const maxPage = Math.min(Math.ceil(totalResults / 30), 50);
  const randomPage = Math.floor(Math.random() * maxPage) + 1;

  const response = await fetch(
    `${INATURALIST_API}/observations?` +
      new URLSearchParams({ ...base, per_page: '30', page: randomPage.toString() })
  );

  if (!response.ok) {
    throw new Error('Failed to fetch insect data');
  }

  const data = await response.json();

  if (!data.results?.length) {
    throw new Error('No insects found');
  }

  const observations = data.results.filter(
    (obs: InsectObservation) => obs.photos?.length > 0 && obs.taxon?.name
  );

  if (observations.length === 0) {
    throw new Error('No valid insects found');
  }

  return observations[Math.floor(Math.random() * observations.length)];
}

async function fetchTaxonNames(taxonId: number): Promise<{ russianName?: string }> {
  try {
    const response = await fetchWithRetry(`${INATURALIST_API}/taxa/${taxonId}?locale=ru`);
    if (!response.ok) return {};
    const data = await response.json();
    return { russianName: data.results[0]?.preferred_common_name };
  } catch {
    return {};
  }
}

async function fetchSimilarSpecies(
  taxonId: number,
  countryId: number,
  count: number = 3
): Promise<AnswerOption[]> {
  const collectedOptions: AnswerOption[] = [];

  try {
    const taxonResponse = await fetch(`${INATURALIST_API}/taxa/${taxonId}`);
    if (!taxonResponse.ok) throw new Error('Failed to fetch taxon details');

    const taxonData = await taxonResponse.json();
    const taxon = taxonData.results[0];
    if (!taxon) throw new Error('Taxon not found');

    let ancestorIndex = taxon.ancestor_ids.length - 2;

    while (collectedOptions.length < count && ancestorIndex >= 0) {
      const parentTaxonId = taxon.ancestor_ids[ancestorIndex];

      const similarResponse = await fetch(
        `${INATURALIST_API}/observations/species_counts?` +
          new URLSearchParams({
            taxon_id: parentTaxonId.toString(),
            place_id: countryId.toString(),
            quality_grade: 'research',
            photos: 'true',
            per_page: '100',
            order: 'desc',
            order_by: 'observations_count',
            rank: taxon.rank,
            locale: 'ru',
          })
      );

      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        const existingIds = new Set([taxonId, ...collectedOptions.map(opt => opt.id)]);

        const newCandidates = await Promise.all(
          similarData.results
            .filter((item: any) => !existingIds.has(item.taxon.id) && item.taxon.name)
            .slice(0, (count - collectedOptions.length) * 2)
            .map(async (item: any) => {
              const { russianName } = await fetchTaxonNames(item.taxon.id);
              return {
                id: item.taxon.id,
                name: item.taxon.name,
                commonName: item.taxon.preferred_common_name,
                russianName,
              };
            })
        );

        collectedOptions.push(...newCandidates);
      }

      ancestorIndex--;
    }

    return collectedOptions.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (error) {
    console.error('Error fetching similar species:', error);

    const remaining = count - collectedOptions.length;
    for (let i = 0; i < remaining; i++) {
      collectedOptions.push({
        id: 1000000 + i,
        name: `Species ${String.fromCharCode(65 + i)}`,
        commonName: undefined,
        russianName: undefined,
      });
    }

    return collectedOptions;
  }
}

export async function fetchQuizQuestion(
  countryId: number = 7161,
  taxonIds: string[] = []
): Promise<QuizQuestion> {
  const insect = await fetchRandomInsect(countryId, taxonIds);

  const [similarSpecies, correctRussianData] = await Promise.all([
    fetchSimilarSpecies(insect.taxon.id, countryId, 3),
    fetchTaxonNames(insect.taxon.id),
  ]);

  const correctAnswer: AnswerOption = {
    id: insect.taxon.id,
    name: insect.taxon.name,
    commonName: insect.taxon.preferred_common_name,
    russianName: correctRussianData.russianName,
  };

  const shuffledOptions = [correctAnswer, ...similarSpecies].sort(() => Math.random() - 0.5);

  return {
    insect,
    options: shuffledOptions,
    correctAnswerId: insect.taxon.id,
  };
}

// --- Checklist API functions ---

async function fetchAllSpeciesCounts(
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<InatSpeciesCountResult[]> {
  const PER_PAGE = 500;
  const firstRes = await fetchWithRetry(
    `${INATURALIST_API}/observations/species_counts?` +
      new URLSearchParams({ ...params, per_page: String(PER_PAGE), page: '1' }),
    3, 1000, signal
  );
  if (!firstRes.ok) throw new Error('iNat species_counts fetch failed');
  const firstData = await firstRes.json();

  const results: InatSpeciesCountResult[] = firstData.results ?? [];
  const total: number = firstData.total_results ?? 0;
  if (total <= PER_PAGE) return results;

  const totalPages = Math.ceil(total / PER_PAGE);
  for (let page = 2; page <= totalPages; page++) {
    const r = await fetchWithRetry(
      `${INATURALIST_API}/observations/species_counts?` +
        new URLSearchParams({ ...params, per_page: String(PER_PAGE), page: String(page) }),
      3, 1000, signal
    );
    if (!r.ok) break;
    const d = await r.json();
    results.push(...(d.results ?? []));
  }
  return results;
}

function withPlace(params: Record<string, string>, placeIds: number[]): Record<string, string> {
  return placeIds.length > 0 ? { ...params, place_id: placeIds.join(',') } : params;
}

export async function fetchRegionalSpecies(
  taxonIds: number[],
  placeIds: number[],
  signal?: AbortSignal
): Promise<InatSpeciesCountResult[]> {
  return fetchAllSpeciesCounts(withPlace({
    taxon_id: taxonIds.join(','),
    quality_grade: 'research',
    rank: 'species',
    locale: 'ru',
  }, placeIds), signal);
}

export async function fetchUserSpeciesInRegion(
  userLogin: string,
  taxonIds: number[],
  placeIds: number[],
  signal?: AbortSignal
): Promise<InatSpeciesCountResult[]> {
  return fetchAllSpeciesCounts(withPlace({
    user_login: userLogin,
    taxon_id: taxonIds.join(','),
    rank: 'species',
    locale: 'ru',
  }, placeIds), signal);
}

export async function fetchUserResearchSpeciesInRegion(
  userLogin: string,
  taxonIds: number[],
  placeIds: number[],
  signal?: AbortSignal
): Promise<InatSpeciesCountResult[]> {
  return fetchAllSpeciesCounts(withPlace({
    user_login: userLogin,
    taxon_id: taxonIds.join(','),
    quality_grade: 'research',
    rank: 'species',
    locale: 'ru',
  }, placeIds), signal);
}

export async function fetchRussianNames(taxonIds: number[], signal?: AbortSignal): Promise<Map<number, string>> {
  const CONCURRENCY = 10;
  const result = new Map<number, string>();
  for (let i = 0; i < taxonIds.length; i += CONCURRENCY) {
    signal?.throwIfAborted();
    await Promise.all(
      taxonIds.slice(i, i + CONCURRENCY).map(async (id) => {
        try {
          const r = await fetch(`${INATURALIST_API}/taxa/${id}?locale=ru`, { signal });
          if (!r.ok) return;
          const d = await r.json();
          const name = d.results?.[0]?.preferred_common_name;
          if (name) result.set(id, name);
        } catch {
          // skip (includes AbortError)
        }
      })
    );
  }
  return result;
}

export interface ObsPoint {
  taxonId: number;
  observed_on: string;
}

export async function fetchUserObservationsAll(
  userLogin: string,
  taxonId: number,
  placeIds: number[]
): Promise<ObsPoint[]> {
  const result: ObsPoint[] = [];
  try {
    let page = 1;
    while (true) {
      const r = await fetchWithRetry(
        `${INATURALIST_API}/observations?` +
          new URLSearchParams(withPlace({
            user_login: userLogin,
            taxon_id: String(taxonId),
            order: 'asc',
            order_by: 'observed_on',
            per_page: '200',
            page: String(page),
            rank: 'species',
          }, placeIds))
      );
      if (!r.ok) break;
      const data = await r.json();
      const obs: Array<{ taxon?: { id: number }; observed_on?: string }> = data.results ?? [];
      for (const ob of obs) {
        const tid = ob.taxon?.id;
        const date = ob.observed_on;
        if (tid && date) result.push({ taxonId: tid, observed_on: date });
      }
      if (obs.length < 200) break;
      page++;
    }
  } catch {
    // return whatever we got
  }
  return result;
}

export async function fetchUserFirstObservations(
  userLogin: string,
  taxonIds: number[],
  placeIds: number[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  try {
    let page = 1;
    while (true) {
      const r = await fetchWithRetry(
        `${INATURALIST_API}/observations?` +
          new URLSearchParams(withPlace({
            user_login: userLogin,
            taxon_id: taxonIds.join(','),
            order: 'asc',
            order_by: 'observed_on',
            per_page: '200',
            page: String(page),
            rank: 'species',
          }, placeIds))
      );
      if (!r.ok) break;
      const data = await r.json();
      const obs: Array<{ taxon?: { id: number }; observed_on?: string }> = data.results ?? [];
      for (const ob of obs) {
        const tid = ob.taxon?.id;
        const date = ob.observed_on;
        if (tid && date && !result.has(tid)) result.set(tid, date);
      }
      if (obs.length < 200) break;
      page++;
    }
  } catch {
    // return whatever we got
  }
  return result;
}
