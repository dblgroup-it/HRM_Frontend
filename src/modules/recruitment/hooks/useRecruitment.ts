import { useQuery } from '@tanstack/react-query';

import { recruitmentApi } from '../api/recruitment.api';

export const recruitmentKeys = {
  all: ['recruitment'] as const,
};

export function useRecruitment() {
  return useQuery({
    queryKey: recruitmentKeys.all,
    queryFn: () => recruitmentApi.getData(),
  });
}
