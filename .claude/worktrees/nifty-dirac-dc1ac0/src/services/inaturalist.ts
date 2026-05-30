import { InsectObservation, QuizQuestion, AnswerOption } from '../types/insect';

const INATURALIST_API = 'https://api.inaturalist.org/v1';

function baseObservationParams(
  countryId: number,
  taxonIds: string[],
  dateFrom?: string,
  dateTo?: string,
  excludeIds?: number[]
): Record<string, string> {
  const params: Record<string, string> = {
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
  if (dateFrom) params.d1 = dateFrom;
  if (dateTo) params.d2 = dateTo;
  if (excludeIds && excludeIds.length > 0) params.not_id = excludeIds.join(',');
  return params;
}

export async function fetchRandomInsect(
  countryId: number = 7161,
  taxonIds: string[] = [],
  dateFrom?: string,
  dateTo?: string,
  excludeIds?: number[]
): Promise<InsectObservation> {
  const base = baseObservationParams(countryId, taxonIds, dateFrom, dateTo, excludeIds);

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
    const response = await fetch(`${INATURALIST_API}/taxa/${taxonId}?locale=ru`);
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
  taxonIds: string[] = [],
  dateFrom?: string,
  dateTo?: string,
  excludeIds?: number[]
): Promise<QuizQuestion> {
  const insect = await fetchRandomInsect(countryId, taxonIds, dateFrom, dateTo, excludeIds);

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
