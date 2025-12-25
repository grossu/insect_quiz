import { Globe } from 'lucide-react';

interface Country {
  id: number;
  name: string;
  nameRu: string;
}

const COUNTRIES: Country[] = [
  { id: 7161, name: 'Russia', nameRu: 'Россия' },
  { id: 1, name: 'United States', nameRu: 'США' },
  { id: 2, name: 'Canada', nameRu: 'Канада' },
  { id: 10, name: 'Brazil', nameRu: 'Бразилия' },
  { id: 16, name: 'China', nameRu: 'Китай' },
  { id: 34, name: 'France', nameRu: 'Франция' },
  { id: 39, name: 'Germany', nameRu: 'Германия' },
  { id: 43, name: 'India', nameRu: 'Индия' },
  { id: 72, name: 'Japan', nameRu: 'Япония' },
  { id: 107, name: 'Mexico', nameRu: 'Мексика' },
  { id: 143, name: 'Spain', nameRu: 'Испания' },
  { id: 161, name: 'United Kingdom', nameRu: 'Великобритания' },
  { id: 20, name: 'Australia', nameRu: 'Австралия' },
  { id: 32, name: 'Egypt', nameRu: 'Египет' },
];

interface CountrySelectorProps {
  selectedCountryId: number;
  onCountryChange: (countryId: number) => void;
}

export function CountrySelector({ selectedCountryId, onCountryChange }: CountrySelectorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={20} className="text-blue-600" />
          <label htmlFor="country" className="text-sm font-medium text-gray-700">
            Страна:
          </label>
        </div>
        <select
          id="country"
          value={selectedCountryId}
          onChange={(e) => onCountryChange(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {COUNTRIES.map((country) => (
            <option key={country.id} value={country.id}>
              {country.nameRu}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
