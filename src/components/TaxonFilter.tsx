import { Check } from 'lucide-react';

export interface Taxon {
  id: string;
  latinName: string;
  russianName: string;
}

interface TaxonFilterProps {
  selectedTaxons: string[];
  onTaxonsChange: (taxons: string[]) => void;
}

const AVAILABLE_TAXONS: Taxon[] = [
  { id: '630955', latinName: 'Apoidea', russianName: 'Пчелиные' },
  { id: '1269342', latinName: 'Pompiloidea', russianName: 'Дорожные осы' },
  { id: '1269344', latinName: 'Scolioidea', russianName: 'Сколии' },
  { id: '52747', latinName: 'Vespidae', russianName: 'Настоящие осы' },
  { id: '47617', latinName: 'Ichneumonoidea', russianName: 'Наездники' },
  { id: '52804', latinName: 'Crabronidae', russianName: 'Песочные осы' },
  { id: '52821', latinName: 'Sphecidae', russianName: 'Роющие осы' },
];

export function TaxonFilter({ selectedTaxons, onTaxonsChange }: TaxonFilterProps) {
  const toggleTaxon = (taxonId: string) => {
    if (selectedTaxons.includes(taxonId)) {
      onTaxonsChange(selectedTaxons.filter(id => id !== taxonId));
    } else {
      onTaxonsChange([...selectedTaxons, taxonId]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Filter by taxon</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {AVAILABLE_TAXONS.map((taxon) => {
            const isSelected = selectedTaxons.includes(taxon.id);
            return (
              <button
                key={taxon.id}
                onClick={() => toggleTaxon(taxon.id)}
                className={`
                  relative flex items-start gap-2 p-2 rounded-md border transition-all text-left
                  ${isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div className={`
                  flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center mt-0.5
                  ${isSelected
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 italic leading-tight">{taxon.latinName}</div>
                  <div className="text-xs text-gray-600 leading-tight mt-0.5">{taxon.russianName}</div>
                </div>
              </button>
            );
          })}
        </div>
        {selectedTaxons.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Selected: {selectedTaxons.length} {selectedTaxons.length === 1 ? 'taxon' : 'taxons'}
            </p>
            <button
              onClick={() => onTaxonsChange([])}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
