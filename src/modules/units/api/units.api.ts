import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  ConfigDepartment,
  ConfigPosition,
  ConfigUnit,
  CreateUnitInput,
  UpsertPositionInput,
} from '../types/unit.types';

export const unitsApi = {
  list(): Promise<ConfigUnit[]> {
    return http
      .get<ApiResponse<ConfigUnit[]>>('/units')
      .then((res) => res.data);
  },

  createUnit(input: CreateUnitInput): Promise<ConfigUnit> {
    return http
      .post<ApiResponse<ConfigUnit>>('/units', input)
      .then((res) => res.data);
  },

  renameUnit(id: string, name: string): Promise<ConfigUnit> {
    return http
      .patch<ApiResponse<ConfigUnit>>(`/units/${id}`, { name })
      .then((res) => res.data);
  },

  deleteUnit(id: string): Promise<{ id: string }> {
    return http
      .delete<ApiResponse<{ id: string }>>(`/units/${id}`)
      .then((res) => res.data);
  },

  addDepartment(unitId: string, name: string): Promise<ConfigDepartment> {
    return http
      .post<ApiResponse<ConfigDepartment>>(`/units/${unitId}/departments`, {
        name,
      })
      .then((res) => res.data);
  },

  renameDepartment(
    departmentId: string,
    name: string,
  ): Promise<ConfigDepartment> {
    return http
      .patch<ApiResponse<ConfigDepartment>>(
        `/units/departments/${departmentId}`,
        { name },
      )
      .then((res) => res.data);
  },

  deleteDepartment(departmentId: string): Promise<{ id: string }> {
    return http
      .delete<ApiResponse<{ id: string }>>(
        `/units/departments/${departmentId}`,
      )
      .then((res) => res.data);
  },

  upsertPosition(
    departmentId: string,
    input: UpsertPositionInput,
  ): Promise<ConfigPosition> {
    return http
      .post<ApiResponse<ConfigPosition>>(
        `/units/departments/${departmentId}/positions`,
        input,
      )
      .then((res) => res.data);
  },

  updatePosition(
    positionId: string,
    input: Partial<UpsertPositionInput>,
  ): Promise<ConfigPosition> {
    return http
      .patch<ApiResponse<ConfigPosition>>(
        `/units/positions/${positionId}`,
        input,
      )
      .then((res) => res.data);
  },

  deletePosition(positionId: string): Promise<{ id: string }> {
    return http
      .delete<ApiResponse<{ id: string }>>(`/units/positions/${positionId}`)
      .then((res) => res.data);
  },
};
