import { ChecklistFamilyGroup, ChecklistRegion } from '../types/insect';

export const CHECKLIST_FAMILY_GROUPS: ChecklistFamilyGroup[] = [
  {
    id: 'apidae',
    labelRu: 'Пчёлы',
    taxonIds: [47221, 127740, 49707, 57668, 57660],
    groupByGenus: true,
  },
  {
    id: 'vespidae',
    labelRu: 'Осы (Vespidae)',
    taxonIds: [52747],
    subgroupIds: [84738, 343248, 119344],
  },
  {
    id: 'scoliidae',
    labelRu: 'Сколии',
    taxonIds: [51967],
  },
  {
    id: 'other_wasps',
    labelRu: 'Chrysididae + Pompilidae + Sphecidae + Crabronidae',
    taxonIds: [126149, 54028, 48742, 51955],
  },
];

export const CHECKLIST_REGIONS: ChecklistRegion[] = [
  {
    id: 'moscow_region',
    labelRu: 'Москва и область',
    placeIds: [11818, 97179],
  },
  {
    id: 'russia',
    labelRu: 'Россия',
    placeIds: [7161],
  },
  {
    id: 'world',
    labelRu: 'Весь мир',
    placeIds: [],
  },
];

export const CHECKLIST_USER_LOGIN = 'grossu_m';
export const CHECKLIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const FAMILY_NAMES: Record<number, string> = {
  // Пчёлы (семейства)
  47221:  'Apidae',
  127740: 'Colletidae',
  49707:  'Halictidae',
  57668:  'Andrenidae',
  57660:  'Megachilidae',
  // Vespidae подсемейства
  84738:  'Vespinae',
  343248: 'Polistinae',
  119344: 'Eumeninae',
  // Одиночные семейства
  52747:  'Vespidae',
  51967:  'Scoliidae',
  126149: 'Chrysididae',
  54028:  'Pompilidae',
  48742:  'Sphecidae',
  51955:  'Crabronidae',
};
