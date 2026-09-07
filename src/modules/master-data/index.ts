export { useMasterData, masterDataKeys } from './hooks/useMasterData';
export { masterDataApi } from './api/masterData.api';
export type { MasterData } from './types/master-data.types';

/** Key into MasterData.sectionSubSections — mirrors the backend's seeding. */
export function sectionKey(department: string, section: string): string {
  return `${department}||${section}`;
}
