import { useState, useEffect } from 'react';
import { Globe, Bug, Check, RotateCcw, Filter } from 'lucide-react';

// Интерфейс для страны
export interface Country {
  id: number;
  name: string;
  nameRu: string;
}

// Интерфейс для таксона
export interface Taxon {
  id: string;
  latinName: string;
  russianName: string;
}

// Доступные страны с русскими названиями
export const AVAILABLE_COUNTRIES: Country[] = [
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

// Доступные таксоны
export const AVAILABLE_TAXONS: Taxon[] = [
  { id: '630955', latinName: 'Apoidea', russianName: 'Пчелиные' },
  { id: '1269342', latinName: 'Pompiloidea', russianName: 'Дорожные осы' },
  { id: '1269344', latinName: 'Scolioidea', russianName: 'Сколии' },
  { id: '52747', latinName: 'Vespidae', russianName: 'Настоящие осы' },
  { id: '47200', latinName: 'Ichneumonoidea', russianName: 'Наездники' },
  { id: '51955', latinName: 'Crabronidae', russianName: 'Песочные осы' },
  { id: '48742', latinName: 'Sphecidae', russianName: 'Роющие осы' },
];

interface FiltersPanelProps {
  selectedCountryId: number;
  selectedTaxons: string[];
  onApply: (countryId: number, taxons: string[]) => void;
  isLoading?: boolean;
}

export function FiltersPanel({
  selectedCountryId,
  selectedTaxons,
  onApply,
  isLoading = false,
}: FiltersPanelProps) {
  // Локальное состояние для "черновика" фильтров (до применения)
  const [draftCountryId, setDraftCountryId] = useState(selectedCountryId);
  const [draftTaxons, setDraftTaxons] = useState<string[]>(selectedTaxons);
  const [isExpanded, setIsExpanded] = useState(true);

  // Синхронизируем локальное состояние с внешним при изменении извне
  useEffect(() => {
    setDraftCountryId(selectedCountryId);
    setDraftTaxons(selectedTaxons);
  }, [selectedCountryId, selectedTaxons]);

  // Переключение выбора таксона
  const toggleTaxon = (taxonId: string) => {
    if (draftTaxons.includes(taxonId)) {
      setDraftTaxons(draftTaxons.filter(id => id !== taxonId));
    } else {
      setDraftTaxons([...draftTaxons, taxonId]);
    }
  };

  // Применить фильтры
  const handleApply = () => {
    // Если таксоны не выбраны, используем все доступные
    const taxonsToApply = draftTaxons.length > 0 ? draftTaxons : [];
    onApply(draftCountryId, taxonsToApply);
  };

  // Сбросить фильтры к значениям по умолчанию
  const handleReset = () => {
    setDraftCountryId(7161); // Россия по умолчанию
    setDraftTaxons(['630955']); // Apoidea по умолчанию
  };

  // Проверка, изменились ли фильтры
  const hasChanges =
    draftCountryId !== selectedCountryId ||
    JSON.stringify([...draftTaxons].sort()) !== JSON.stringify([...selectedTaxons].sort());

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Заголовок с кнопкой сворачивания */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Filter size={24} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Фильтры поиска
            </h2>
            {hasChanges && (
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                Не применены
              </span>
            )}
          </div>
          <div className="text-gray-500">
            {isExpanded ? '▼' : '▶'}
          </div>
        </button>

        {/* Содержимое фильтров */}
        {isExpanded && (
          <div className="p-6 space-y-6">
            {/* Фильтр по стране */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={20} className="text-blue-600" />
                <label htmlFor="country-filter" className="text-sm font-semibold text-gray-700">
                  Страна наблюдения
                </label>
              </div>
              <select
                id="country-filter"
                value={draftCountryId}
                onChange={(e) => setDraftCountryId(Number(e.target.value))}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                aria-label="Выберите страну для фильтрации наблюдений"
              >
                {AVAILABLE_COUNTRIES.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.nameRu}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Будут показаны насекомые, наблюдавшиеся в выбранной стране
              </p>
            </div>

            {/* Разделитель */}
            <div className="border-t border-gray-200"></div>

            {/* Фильтр по таксонам */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bug size={20} className="text-green-600" />
                <label className="text-sm font-semibold text-gray-700">
                  Группы насекомых (таксоны)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_TAXONS.map((taxon) => {
                  const isSelected = draftTaxons.includes(taxon.id);
                  return (
                    <button
                      key={taxon.id}
                      onClick={() => toggleTaxon(taxon.id)}
                      disabled={isLoading}
                      className={`
                        relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left
                        ${isSelected
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      aria-label={`${isSelected ? 'Снять выбор' : 'Выбрать'} таксон ${taxon.russianName}`}
                      aria-pressed={isSelected}
                    >
                      {/* Чекбокс */}
                      <div className={`
                        flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                        ${isSelected
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 bg-white'
                        }
                      `}>
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>

                      {/* Информация о таксоне */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 italic leading-tight">
                          {taxon.latinName}
                        </div>
                        <div className="text-xs text-gray-600 leading-tight mt-1">
                          {taxon.russianName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Счетчик выбранных таксонов */}
              {draftTaxons.length > 0 && (
                <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Выбрано:</span> {draftTaxons.length} {
                      draftTaxons.length === 1
                        ? 'таксон'
                        : draftTaxons.length < 5
                          ? 'таксона'
                          : 'таксонов'
                    }
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Выберите одну или несколько групп. Если ничего не выбрано, будут показаны все группы.
              </p>
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleApply}
                disabled={isLoading || !hasChanges}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                  ${isLoading || !hasChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                  }
                `}
                aria-label="Применить выбранные фильтры"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Применить {hasChanges && 'изменения'}
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Сбросить фильтры к значениям по умолчанию"
              >
                <RotateCcw size={20} />
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
