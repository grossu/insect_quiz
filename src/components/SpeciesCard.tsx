import { Bug } from 'lucide-react';
import { ChecklistSpecies } from '../types/insect';
import { getImageUrl } from '../utils/imageUtils';

interface SpeciesCardProps {
  species: ChecklistSpecies;
  placeIds: number[];
  found?: boolean;
}

function countBadgeClass(count: number): string {
  if (count >= 10) return 'bg-green-100 text-green-800';
  if (count >= 3) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function SpeciesCard({ species, placeIds, found = false }: SpeciesCardProps) {
  const inatUrl = `https://www.inaturalist.org/observations?taxon_id=${species.taxonId}&place_id=${placeIds.join(',')}`;
  const imgUrl = species.photoUrl ? getImageUrl(species.photoUrl, 'small') : null;
  const confirmed = species.foundConfirmed;

  return (
    <a
      href={inatUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col rounded-xl overflow-hidden shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 ${
        found && confirmed
          ? 'border-green-300 bg-green-50 opacity-80'
          : found && !confirmed
          ? 'border-amber-300 bg-amber-50 opacity-90'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={species.latinName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Bug size={40} />
          </div>
        )}

        {/* Found + research grade: green checkmark */}
        {found && confirmed && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Found but needs_id: amber badge */}
        {found && !confirmed && (
          <div
            className="absolute top-2 right-2 bg-amber-400 text-white rounded-full p-1"
            title="Наблюдение ожидает подтверждения (needs ID)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        <div className={`absolute bottom-2 left-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${countBadgeClass(species.regionalCount)}`}>
          {species.regionalCount} набл.
        </div>
      </div>
      <div className="p-2 flex flex-col gap-0.5 min-w-0">
        <span className="text-xs italic text-gray-800 font-medium leading-tight truncate">
          {species.latinName}
        </span>
        {species.russianName && (
          <span className="text-xs text-gray-500 leading-tight truncate">
            {species.russianName}
          </span>
        )}
      </div>
    </a>
  );
}
