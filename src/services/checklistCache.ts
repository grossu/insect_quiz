import { ChecklistCacheEntry } from '../types/insect';
import { CHECKLIST_CACHE_TTL_MS } from '../data/checklist';

function cacheKey(taxonIds: number[], placeIds: number[]): string {
  return `checklist_${taxonIds.slice().sort().join('_')}_place${placeIds.slice().sort().join('_')}`;
}

export function readCache(taxonIds: number[], placeIds: number[]): ChecklistCacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(taxonIds, placeIds));
    if (!raw) return null;
    const entry: ChecklistCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CHECKLIST_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(taxonIds, placeIds));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function writeCache(
  taxonIds: number[],
  placeIds: number[],
  data: Omit<ChecklistCacheEntry, 'timestamp'>
): void {
  try {
    const payload: ChecklistCacheEntry = { ...data, timestamp: Date.now() };
    localStorage.setItem(cacheKey(taxonIds, placeIds), JSON.stringify(payload));
  } catch {
    // localStorage quota exceeded — skip silently
  }
}

export function invalidateCache(taxonIds: number[], placeIds: number[]): void {
  try {
    localStorage.removeItem(cacheKey(taxonIds, placeIds));
  } catch {
    // ignore
  }
}
