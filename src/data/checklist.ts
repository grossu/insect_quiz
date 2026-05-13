import { ChecklistFamilyGroup, ChecklistRegion } from '../types/insect';

export const CHECKLIST_FAMILY_GROUPS: ChecklistFamilyGroup[] = [
  {
    id: 'apidae',
    labelRu: 'Пчёлы',
    // Apidae, Colletidae, Halictidae, Andrenidae, Megachilidae
    taxonIds: [47221, 127740, 49707, 57668, 57660],
  },
  {
    id: 'vespidae',
    labelRu: 'Осы (Vespidae)',
    taxonIds: [52747],
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
];

export const CHECKLIST_USER_LOGIN = 'grossu_m';
export const CHECKLIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const FAMILY_NAMES: Record<number, string> = {
  // Пчёлы
  47221:  'Apidae',
  127740: 'Colletidae',
  49707:  'Halictidae',
  57668:  'Andrenidae',
  57660:  'Megachilidae',
  // Осы
  52747:  'Vespidae',
  // Сколии
  51967:  'Scoliidae',
  // Прочие осы
  126149: 'Chrysididae',
  54028:  'Pompilidae',
  48742:  'Sphecidae',
  51955:  'Crabronidae',
};
