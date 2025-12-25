import { InsectObservation, QuizQuestion, AnswerOption } from '../types/insect';

const INATURALIST_API = 'https://api.inaturalist.org/v1';

export async function fetchRandomInsect(
  countryId: number = 7161,
  taxonIds: string[] = []
): Promise<InsectObservation> {
  const params: Record<string, string> = {
    taxon_id: taxonIds.length > 0 ? taxonIds.join(',') : '47201',
    place_id: countryId.toString(),
    quality_grade: 'research',
    photos: 'true',
    identifications: 'most_agree',
    per_page: '1',
    page: '1',
    order: 'desc',
    order_by: 'created_at',
    without_taxon_id: '1269340',
    popular: 'true'
  };

  const initialResponse = await fetch(
    `${INATURALIST_API}/observations?` + new URLSearchParams(params)
  );

  if (!initialResponse.ok) {
    throw new Error('Failed to fetch insect data');
  }

  const initialData = await initialResponse.json();
  const totalResults = initialData.total_results;

  if (!totalResults || totalResults === 0) {
    throw new Error('No insects found');
  }

  const maxPage = Math.min(Math.ceil(totalResults / 30), 50);
  const randomPage = Math.floor(Math.random() * maxPage) + 1;

  const randomParams: Record<string, string> = {
    taxon_id: taxonIds.length > 0 ? taxonIds.join(',') : '47201',
    place_id: countryId.toString(),
    quality_grade: 'research',
    photos: 'true',
    identifications: 'most_agree',
    per_page: '30',
    page: randomPage.toString(),
    order: 'desc',
    order_by: 'created_at',
    without_taxon_id: '1269340',
    popular: 'true'
  };

  const response = await fetch(
    `${INATURALIST_API}/observations?` + new URLSearchParams(randomParams)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch insect data');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('No insects found');
  }

  const observations = data.results.filter(
    (obs: InsectObservation) =>
      obs.photos?.length > 0 &&
      obs.taxon?.name
  );

  if (observations.length === 0) {
    throw new Error('No valid insects found');
  }

  const randomIndex = Math.floor(Math.random() * observations.length);
  return observations[randomIndex];
}

export function normalizeScientificName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

async function fetchTaxonNames(taxonId: number): Promise<{ russianName?: string }> {
  try {
    const response = await fetch(
      `${INATURALIST_API}/taxa/${taxonId}?locale=ru`
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const taxon = data.results[0];

    return {
      russianName: taxon?.preferred_common_name
    };
  } catch (error) {
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
    const response = await fetch(
      `${INATURALIST_API}/taxa/${taxonId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch taxon details');
    }

    const data = await response.json();
    const taxon = data.results[0];

    if (!taxon) {
      throw new Error('Taxon not found');
    }

    let ancestorIndex = taxon.ancestor_ids.length - 2;

    while (collectedOptions.length < count && ancestorIndex >= 0) {
      const parentTaxonId = taxon.ancestor_ids[ancestorIndex];

      const params: Record<string, string> = {
        taxon_id: parentTaxonId.toString(),
        place_id: countryId.toString(),
        quality_grade: 'research',
        photos: 'true',
        per_page: '100',
        order: 'desc',
        order_by: 'observations_count',
        rank: taxon.rank,
        locale: 'ru'
      };

      const similarResponse = await fetch(
        `${INATURALIST_API}/observations/species_counts?` + new URLSearchParams(params)
      );

      if (similarResponse.ok) {
        const similarData = await similarResponse.json();

        const existingIds = new Set([taxonId, ...collectedOptions.map(opt => opt.id)]);

        const candidatesPromises = similarData.results
          .filter((item: any) => !existingIds.has(item.taxon.id) && item.taxon.name)
          .slice(0, (count - collectedOptions.length) * 2)
          .map(async (item: any) => {
            const russianData = await fetchTaxonNames(item.taxon.id);
            return {
              id: item.taxon.id,
              name: item.taxon.name,
              commonName: item.taxon.preferred_common_name,
              russianName: russianData.russianName
            };
          });

        const newCandidates = await Promise.all(candidatesPromises);
        collectedOptions.push(...newCandidates);
      }

      ancestorIndex--;
    }

    const shuffled = collectedOptions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Error fetching similar species:', error);

    if (collectedOptions.length < count) {
      const remaining = count - collectedOptions.length;
      for (let i = 0; i < remaining; i++) {
        collectedOptions.push({
          id: 1000000 + i,
          name: `Species ${String.fromCharCode(65 + i)}`,
          commonName: undefined,
          russianName: undefined
        });
      }
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
    fetchTaxonNames(insect.taxon.id)
  ]);

  const correctAnswer: AnswerOption = {
    id: insect.taxon.id,
    name: insect.taxon.name,
    commonName: insect.taxon.preferred_common_name,
    russianName: correctRussianData.russianName
  };

  const allOptions = [correctAnswer, ...similarSpecies];
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

  return {
    insect,
    options: shuffledOptions,
    correctAnswerId: insect.taxon.id
  };
}
