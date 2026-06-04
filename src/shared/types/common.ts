/** Shared primitives reused across every module. */

export type ID = string;

export type ISODateString = string;

/** Generic option used by selects, filters, and dropdowns. */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/** Standard envelope returned by the (mock) API layer. */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/** Cursor/page metadata for list endpoints. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/** Loading lifecycle status, useful for non-Query async state. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
