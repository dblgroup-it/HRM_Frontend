import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type { AppNotification } from '../types/notification.types';

export const notificationsApi = {
  list(): Promise<AppNotification[]> {
    return http
      .get<ApiResponse<AppNotification[]>>('/notifications')
      .then((res) => res.data);
  },

  unreadCount(): Promise<number> {
    return http
      .get<ApiResponse<number>>('/notifications/unread-count')
      .then((res) => res.data);
  },

  markRead(id: string): Promise<{ id: string }> {
    return http
      .patch<ApiResponse<{ id: string }>>(`/notifications/${id}/read`)
      .then((res) => res.data);
  },

  markAllRead(): Promise<{ ok: boolean }> {
    return http
      .post<ApiResponse<{ ok: boolean }>>('/notifications/read-all')
      .then((res) => res.data);
  },
};
