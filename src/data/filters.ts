import { Country, Taxon } from '../types/insect';

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

export const AVAILABLE_TAXONS: Taxon[] = [
  { id: '630955', latinName: 'Apoidea', russianName: 'Пчелиные' },
  { id: '1269342', latinName: 'Pompiloidea', russianName: 'Дорожные осы' },
  { id: '1269344', latinName: 'Scolioidea', russianName: 'Сколии' },
  { id: '52747', latinName: 'Vespidae', russianName: 'Настоящие осы' },
  { id: '47200', latinName: 'Ichneumonoidea', russianName: 'Наездники' },
  { id: '51955', latinName: 'Crabronidae', russianName: 'Песочные осы' },
  { id: '48742', latinName: 'Sphecidae', russianName: 'Роющие осы' },
];

export const DEFAULT_COUNTRY_ID = 7161;
export const DEFAULT_TAXONS = ['630955'];
